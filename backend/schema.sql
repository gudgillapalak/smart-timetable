CREATE TABLE IF NOT EXISTS faculty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NULL,
  department VARCHAR(80) NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('admin','faculty','student') NOT NULL,
  faculty_id INT NULL,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS faculty_prefs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  `day` TINYINT NOT NULL,
  slot TINYINT NOT NULL,
  kind ENUM('unavailable','dislike') NOT NULL,
  UNIQUE KEY uq_pref (faculty_id, `day`, slot),
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  size INT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  capacity INT NOT NULL,
  type ENUM('classroom','lab') NOT NULL DEFAULT 'classroom'
);

CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(120) NOT NULL,
  type ENUM('theory','lab') NOT NULL DEFAULT 'theory',
  sessions_per_week TINYINT NOT NULL DEFAULT 3,
  duration TINYINT NOT NULL DEFAULT 1,
  faculty_id INT NOT NULL,
  batch_id INT NOT NULL,
  UNIQUE KEY uq_subject (batch_id, code),
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY,
  days JSON NOT NULL,
  slots_per_day TINYINT NOT NULL DEFAULT 7,
  start_time VARCHAR(5) NOT NULL DEFAULT '09:00',
  slot_minutes SMALLINT NOT NULL DEFAULT 60
);

-- Every generated / cloned timetable is one saved "version"
CREATE TABLE IF NOT EXISTS timetables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  algorithm ENUM('ga','sa','pso','clone') NOT NULL,
  params JSON NULL,
  config JSON NOT NULL,
  fitness DOUBLE NOT NULL,
  cost DOUBLE NOT NULL,
  hard_conflicts INT NOT NULL,
  soft_penalty DOUBLE NOT NULL,
  duration_ms INT NOT NULL DEFAULT 0,
  history JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  manual_edits INT NOT NULL DEFAULT 0,
  parent_id INT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timetable_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timetable_id INT NOT NULL,
  subject_id INT NOT NULL,
  batch_id INT NOT NULL,
  faculty_id INT NOT NULL,
  room_id INT NOT NULL,
  `day` TINYINT NOT NULL,
  slot TINYINT NOT NULL,
  `length` TINYINT NOT NULL DEFAULT 1,
  INDEX idx_tt (timetable_id),
  FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE RESTRICT,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
);
