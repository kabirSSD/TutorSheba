const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool = null;
let isConnected = false;
let lastError = null;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tuitionhub_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

function getSafeConfig() {
  return {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
  };
}

function formatErrorMessage(err) {
  if (!err) return 'Unknown error';
  if (err.code === 'ECONNREFUSED') {
    return `ECONNREFUSED: MySQL server is not running on ${dbConfig.host}:${dbConfig.port}`;
  }
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    return `Access denied for user '${dbConfig.user}' (check DB_PASSWORD in .env)`;
  }
  return err.message || err.code || String(err);
}

async function initDatabase(initialData) {
  try {
    // Step 1: Connect to MySQL server (without specifying DB in case it doesn't exist yet)
    const rootConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      connectTimeout: 4000,
    });

    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConnection.end();

    // Step 2: Create connection pool with database selected
    pool = mysql.createPool(dbConfig);

    // Step 3: Run table migrations
    await createTables();

    // Step 4: Seed if users table is empty
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0 && initialData) {
      await seedFromData(initialData);
    }

    isConnected = true;
    lastError = null;
    return { success: true };
  } catch (error) {
    const formatted = formatErrorMessage(error);
    isConnected = false;
    lastError = formatted;
    return { success: false, error: formatted };
  }
}

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(50) NOT NULL,
      pass VARCHAR(255) NOT NULL,
      role ENUM('admin', 'tutor', 'student') NOT NULL DEFAULT 'student',
      status ENUM('approved', 'pending', 'rejected') NOT NULL DEFAULT 'approved',
      subjects TEXT DEFAULT NULL,
      classes VARCHAR(255) DEFAULT NULL,
      location VARCHAR(255) DEFAULT NULL,
      fee INT DEFAULT 0,
      edu TEXT DEFAULT NULL,
      bio TEXT DEFAULT NULL,
      mode VARCHAR(50) DEFAULT 'Offline',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS requests (
      id BIGINT PRIMARY KEY,
      sid BIGINT NOT NULL,
      tid BIGINT NOT NULL,
      subject VARCHAR(255) NOT NULL,
      msg TEXT,
      status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_requests_sid (sid),
      INDEX idx_requests_tid (tid),
      CONSTRAINT fk_requests_student FOREIGN KEY (sid) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_requests_tutor FOREIGN KEY (tid) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id BIGINT PRIMARY KEY,
      sid BIGINT NOT NULL,
      tid BIGINT NOT NULL,
      rating INT NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_reviews_sid (sid),
      INDEX idx_reviews_tid (tid),
      CONSTRAINT fk_reviews_student FOREIGN KEY (sid) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_reviews_tutor FOREIGN KEY (tid) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function seedFromData(data) {
  if (!pool || !data) return;

  if (Array.isArray(data.users) && data.users.length > 0) {
    for (const u of data.users) {
      await pool.query(
        `INSERT IGNORE INTO users (id, name, email, phone, pass, role, status, subjects, classes, location, fee, edu, bio, mode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          u.id,
          u.name,
          u.email,
          u.phone,
          u.pass,
          u.role,
          u.status || 'approved',
          u.subjects || null,
          u.classes || null,
          u.location || null,
          Number(u.fee || 0),
          u.edu || null,
          u.bio || null,
          u.mode || 'Offline',
        ]
      );
    }
  }

  if (Array.isArray(data.requests) && data.requests.length > 0) {
    for (const r of data.requests) {
      await pool.query(
        `INSERT IGNORE INTO requests (id, sid, tid, subject, msg, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, r.sid, r.tid, r.subject, r.msg, r.status || 'Pending']
      );
    }
  }

  if (Array.isArray(data.reviews) && data.reviews.length > 0) {
    for (const rv of data.reviews) {
      await pool.query(
        `INSERT IGNORE INTO reviews (id, sid, tid, rating, comment)
         VALUES (?, ?, ?, ?, ?)`,
        [rv.id, rv.sid, rv.tid, Number(rv.rating || 5), rv.comment]
      );
    }
  }
}

async function getAllData() {
  if (!isConnected || !pool) return null;

  const [users] = await pool.query('SELECT * FROM users ORDER BY id ASC');
  const [requests] = await pool.query('SELECT * FROM requests ORDER BY id DESC');
  const [reviews] = await pool.query('SELECT * FROM reviews ORDER BY id DESC');

  const cleanUsers = users.map((u) => ({
    id: Number(u.id),
    name: u.name,
    email: u.email,
    phone: u.phone,
    pass: u.pass,
    role: u.role,
    status: u.status,
    subjects: u.subjects || '',
    classes: u.classes || '',
    location: u.location || '',
    fee: Number(u.fee || 0),
    edu: u.edu || '',
    bio: u.bio || '',
    mode: u.mode || 'Offline',
  }));

  const cleanRequests = requests.map((r) => ({
    id: Number(r.id),
    sid: Number(r.sid),
    tid: Number(r.tid),
    subject: r.subject,
    msg: r.msg,
    status: r.status,
  }));

  const cleanReviews = reviews.map((r) => ({
    id: Number(r.id),
    sid: Number(r.sid),
    tid: Number(r.tid),
    rating: Number(r.rating),
    comment: r.comment,
  }));

  return {
    users: cleanUsers,
    requests: cleanRequests,
    reviews: cleanReviews,
  };
}

async function syncAllData(data) {
  if (!isConnected || !pool) return false;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Sync users
    if (Array.isArray(data.users)) {
      const userIds = data.users.map((u) => u.id);
      if (userIds.length > 0) {
        await conn.query('DELETE FROM users WHERE id NOT IN (?)', [userIds]);
      } else {
        await conn.query('DELETE FROM users');
      }

      for (const u of data.users) {
        await conn.query(
          `INSERT INTO users (id, name, email, phone, pass, role, status, subjects, classes, location, fee, edu, bio, mode)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name=VALUES(name), email=VALUES(email), phone=VALUES(phone), pass=VALUES(pass),
             role=VALUES(role), status=VALUES(status), subjects=VALUES(subjects), classes=VALUES(classes),
             location=VALUES(location), fee=VALUES(fee), edu=VALUES(edu), bio=VALUES(bio), mode=VALUES(mode)`,
          [
            u.id,
            u.name,
            u.email,
            u.phone,
            u.pass,
            u.role,
            u.status || 'approved',
            u.subjects || '',
            u.classes || '',
            u.location || '',
            Number(u.fee || 0),
            u.edu || '',
            u.bio || '',
            u.mode || 'Offline',
          ]
        );
      }
    }

    // 2. Sync requests
    if (Array.isArray(data.requests)) {
      const reqIds = data.requests.map((r) => r.id);
      if (reqIds.length > 0) {
        await conn.query('DELETE FROM requests WHERE id NOT IN (?)', [reqIds]);
      } else {
        await conn.query('DELETE FROM requests');
      }

      for (const r of data.requests) {
        await conn.query(
          `INSERT INTO requests (id, sid, tid, subject, msg, status)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             subject=VALUES(subject), msg=VALUES(msg), status=VALUES(status)`,
          [r.id, r.sid, r.tid, r.subject, r.msg, r.status || 'Pending']
        );
      }
    }

    // 3. Sync reviews
    if (Array.isArray(data.reviews)) {
      const revIds = data.reviews.map((r) => r.id);
      if (revIds.length > 0) {
        await conn.query('DELETE FROM reviews WHERE id NOT IN (?)', [revIds]);
      } else {
        await conn.query('DELETE FROM reviews');
      }

      for (const r of data.reviews) {
        await conn.query(
          `INSERT INTO reviews (id, sid, tid, rating, comment)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             rating=VALUES(rating), comment=VALUES(comment)`,
          [r.id, r.sid, r.tid, Number(r.rating || 5), r.comment]
        );
      }
    }

    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
  }
}

module.exports = {
  dbConfig,
  getSafeConfig,
  initDatabase,
  getAllData,
  syncAllData,
  closePool,
  isDbConnected: () => isConnected,
  getLastError: () => lastError,
};
