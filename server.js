require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const db = require('./db');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = Number(process.env.PORT || 3000);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function buildInitialData() {
  const tutorPassword = sha256('tutor123');

  const tutor = (id, name, subjects, classes, location, fee, edu, bio, mode) => ({
    id,
    name,
    email: `${name.split(' ')[0].toLowerCase()}@mail.com`,
    phone: `01711000${id}00`,
    pass: tutorPassword,
    role: 'tutor',
    status: 'approved',
    subjects,
    classes,
    location,
    fee,
    edu,
    bio,
    mode,
  });

  return {
    users: [
      {
        id: 1,
        name: 'Admin',
        email: 'admin@tuitionhub.com',
        phone: '01700000000',
        pass: sha256('admin123'),
        role: 'admin',
        status: 'approved',
      },
      tutor(2, 'Rahim Uddin', 'Math, Physics', 'Class 9-10, HSC', 'Dhaka', 3000, 'BSc in Mathematics, DU', 'Five years of teaching experience with a focus on exam practice.', 'Offline'),
      tutor(3, 'Nusrat Jahan', 'English, Bangla', 'Class 6-8, SSC', 'Tangail', 2000, 'BA in English, JU', 'Friendly teacher who builds reading and writing confidence.', 'Online'),
      tutor(4, 'Tanvir Hasan', 'Chemistry, Biology', 'SSC, HSC', 'Dhaka', 3500, 'MBBS student, DMC', 'Concept-first teaching with weekly tests.', 'Online'),
      tutor(5, 'Mitu Akter', 'ICT, Math', 'Class 6-10', 'Mymensingh', 1800, 'BSc in CSE, MIST', 'Beginner-friendly ICT and programming basics.', 'Offline'),
    ],
    requests: [],
    reviews: [],
  };
}

function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(buildInitialData(), null, 2));
  }
}

function readDatabase() {
  ensureDatabase();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (error) {
    const fallback = buildInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

function writeDatabase(data) {
  ensureDatabase();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Unified async data access with MySQL priority and JSON fallback
async function getData() {
  if (db.isDbConnected()) {
    try {
      const sqlData = await db.getAllData();
      if (sqlData) return sqlData;
    } catch (err) {
      console.warn('MySQL read error, falling back to db.json:', err.message);
    }
  }
  return readDatabase();
}

async function saveData(data) {
  // Always update JSON file as backup
  writeDatabase(data);

  if (db.isDbConnected()) {
    try {
      await db.syncAllData(data);
    } catch (err) {
      console.warn('MySQL sync error, saved to db.json backup:', err.message);
    }
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(payload));
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.sql': 'text/plain; charset=utf-8',
  };
  return types[ext] || 'application/octet-stream';
}

function serveStaticFile(response, relativePath) {
  const safePath = path.normalize(path.join(ROOT, relativePath));

  if (!safePath.startsWith(ROOT)) {
    sendJson(response, 403, { message: 'Forbidden' });
    return;
  }

  const filePath = fs.existsSync(safePath) ? safePath : path.join(ROOT, 'index.html');

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, 500, { message: 'Unable to load page' });
      return;
    }

    response.writeHead(200, { 'Content-Type': getContentType(filePath) });
    response.end(content);
  });
}

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok' });
    return true;
  }

  if (pathname === '/api/db-status') {
    sendJson(response, 200, {
      connected: db.isDbConnected(),
      engine: db.isDbConnected() ? 'mysql' : 'json_fallback',
      config: db.getSafeConfig(),
      error: db.getLastError(),
    });
    return true;
  }

  if (pathname === '/api/data') {
    if (request.method === 'GET') {
      const data = await getData();
      sendJson(response, 200, data);
      return true;
    }

    if (request.method === 'PUT') {
      let raw = '';
      request.on('data', (chunk) => {
        raw += chunk;
      });
      request.on('end', async () => {
        try {
          const parsed = raw ? JSON.parse(raw) : { users: [], requests: [], reviews: [] };
          await saveData(parsed);
          sendJson(response, 200, { success: true, data: parsed });
        } catch (error) {
          sendJson(response, 400, { message: 'Invalid JSON payload.' });
        }
      });
      return true;
    }
  }

  if (pathname === '/api/seed') {
    if (request.method === 'POST') {
      const initial = buildInitialData();
      await saveData(initial);
      sendJson(response, 200, initial);
      return true;
    }
  }

  return false;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    response.end();
    return;
  }

  if (pathname.startsWith('/api/')) {
    const handled = await handleApi(request, response);
    if (handled) return;
    sendJson(response, 404, { message: 'API endpoint not found.' });
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  serveStaticFile(response, relativePath);
});

async function startServer() {
  console.log('🔄 Checking MySQL database connection...');
  const initResult = await db.initDatabase(buildInitialData());

  if (initResult.success) {
    console.log(`✅ Connected to MySQL database (${db.dbConfig.database}) on ${db.dbConfig.host}:${db.dbConfig.port}`);
  } else {
    console.log(`⚠️ MySQL connection unready: ${initResult.error}`);
    console.log('ℹ️ Running in fallback mode using data/db.json. Once MySQL is configured/started, restart server to connect.');
  }

  server.listen(PORT, () => {
    console.log(`🚀 TuitionHub backend running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  buildInitialData,
  readDatabase,
  writeDatabase,
  getData,
  saveData,
  server,
  db,
};
