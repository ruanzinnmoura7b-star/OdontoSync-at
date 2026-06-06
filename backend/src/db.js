const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_FILE = process.env.DB_FILE || './src/data/clinica-a.sqlite';
const absolutePath = path.resolve(DB_FILE);
fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

const db = new sqlite3.Database(absolutePath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

function onlyNumbers(value = '') {
  return String(value).replace(/\D/g, '');
}

async function initDatabase() {
  await run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    tipo TEXT NOT NULL,
    nome TEXT NOT NULL,
    cpf TEXT,
    clinica TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,
    usuario TEXT NOT NULL,
    clinica TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS consultas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente TEXT NOT NULL,
    cpf TEXT NOT NULL,
    usuarioPaciente TEXT NOT NULL,
    dentista TEXT NOT NULL,
    data TEXT NOT NULL,
    hora TEXT NOT NULL,
    clinica TEXT NOT NULL,
    sincronizado INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'agendada'
  )`);

  await run(`CREATE TABLE IF NOT EXISTS prontuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente TEXT NOT NULL,
    cpf TEXT,
    usuarioPaciente TEXT,
    procedimento TEXT NOT NULL,
    descricao TEXT NOT NULL
  )`);

  await seedDemoData();
}

async function seedDemoData() {
  const total = await get('SELECT COUNT(*) AS total FROM usuarios');
  if (total.total > 0) return;

  const clinicaAtual = process.env.CLINICA || 'Clínica A';

  // O doutor existe em todos os nós para facilitar o acesso ao painel administrativo.
  await run('INSERT INTO usuarios (usuario, senha, tipo, nome, cpf, clinica) VALUES (?, ?, ?, ?, ?, ?)',
    ['doutor', '123', 'doutor', 'Dr. Admin', null, clinicaAtual]);

  // Os dados de demonstração do paciente ficam inicialmente na Clínica A.
  // A Clínica B começa praticamente vazia para evidenciar que os bancos são independentes.
  if (clinicaAtual !== 'Clínica A') return;

  await run('INSERT INTO usuarios (usuario, senha, tipo, nome, cpf, clinica) VALUES (?, ?, ?, ?, ?, ?)',
    ['paciente', '123', 'paciente', 'Ana Beatriz', '123.456.789-00', 'Clínica A']);
  await run('INSERT INTO pacientes (nome, cpf, usuario, clinica) VALUES (?, ?, ?, ?)',
    ['Ana Beatriz', '123.456.789-00', 'paciente', 'Clínica A']);
  await run(`INSERT INTO consultas
    (paciente, cpf, usuarioPaciente, dentista, data, hora, clinica, sincronizado, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Ana Beatriz', '123.456.789-00', 'paciente', 'Dra. Fernanda', '2026-05-20', '09:00', 'Clínica A', 1, 'agendada']);
  await run(`INSERT INTO prontuarios
    (paciente, cpf, usuarioPaciente, procedimento, descricao)
    VALUES (?, ?, ?, ?, ?)`,
    ['Ana Beatriz', '123.456.789-00', 'paciente', 'Limpeza', 'Paciente realizou limpeza e avaliação inicial.']);
}

function mapConsulta(row) {
  if (!row) return row;
  return { ...row, sincronizado: Boolean(row.sincronizado) };
}

module.exports = { db, DB_FILE: absolutePath, run, get, all, initDatabase, onlyNumbers, mapConsulta };
