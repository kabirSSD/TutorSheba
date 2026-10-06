-- TuitionHub MySQL Schema
-- Run this in MySQL Workbench or let server.js run it automatically.

CREATE DATABASE IF NOT EXISTS tuitionhub_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tuitionhub_db;

-- 1. Users Table (admins, tutors, students)
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

-- 2. Tuition Requests Table
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

-- 3. Reviews Table
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

-- Seed default admin and tutors if they do not exist
-- Passwords:
-- Admin: admin123 (SHA-256: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9)
-- Tutors: tutor123 (SHA-256: eedba3be7f5255476a21852d45388414436531393ce0c679a0225134fd2cb9db)

INSERT IGNORE INTO users (id, name, email, phone, pass, role, status, subjects, classes, location, fee, edu, bio, mode) VALUES
(1, 'Admin', 'admin@tuitionhub.com', '01700000000', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 'approved', NULL, NULL, NULL, 0, NULL, NULL, 'Offline'),
(2, 'Rahim Uddin', 'rahim@mail.com', '01711000200', 'eedba3be7f5255476a21852d45388414436531393ce0c679a0225134fd2cb9db', 'tutor', 'approved', 'Math, Physics', 'Class 9-10, HSC', 'Dhaka', 3000, 'BSc in Mathematics, DU', 'Five years of teaching experience with a focus on exam practice.', 'Offline'),
(3, 'Nusrat Jahan', 'nusrat@mail.com', '01711000300', 'eedba3be7f5255476a21852d45388414436531393ce0c679a0225134fd2cb9db', 'tutor', 'approved', 'English, Bangla', 'Class 6-8, SSC', 'Tangail', 2000, 'BA in English, JU', 'Friendly teacher who builds reading and writing confidence.', 'Online'),
(4, 'Tanvir Hasan', 'tanvir@mail.com', '01711000400', 'eedba3be7f5255476a21852d45388414436531393ce0c679a0225134fd2cb9db', 'tutor', 'approved', 'Chemistry, Biology', 'SSC, HSC', 'Dhaka', 3500, 'MBBS student, DMC', 'Concept-first teaching with weekly tests.', 'Online'),
(5, 'Mitu Akter', 'mitu@mail.com', '01711000500', 'eedba3be7f5255476a21852d45388414436531393ce0c679a0225134fd2cb9db', 'tutor', 'approved', 'ICT, Math', 'Class 6-10', 'Mymensingh', 1800, 'BSc in CSE, MIST', 'Beginner-friendly ICT and programming basics.', 'Offline');
