const express = require('express');
const cors = require('cors');
const { run, get, all, initDatabase, onlyNumbers, mapConsulta, DB_FILE } = require('./db');
const { dataHoraNoPassado, validarCamposObrigatorios } = require('./validations');

const app = express();
const PORT = process.env.PORT || 3000;
const CLINICA = process.env.CLINICA || 'Clínica A';

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mensagem: 'API OdontoSync online', clinica: CLINICA, banco: DB_FILE });
});

app.post('/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const encontrado = await get(
      'SELECT id, usuario, tipo, nome, cpf, clinica FROM usuarios WHERE usuario = ? AND senha = ?',
      [usuario, senha]
    );
    if (!encontrado) return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
    res.json({ usuario: encontrado });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao fazer login.' });
  }
});

app.post('/usuarios', async (req, res) => {
  try {
    const { nome, cpf, usuario, senha, clinica = CLINICA } = req.body;
    const faltando = validarCamposObrigatorios(req.body, ['nome', 'cpf', 'usuario', 'senha']);
    if (faltando.length) return res.status(400).json({ erro: `Campos obrigatórios: ${faltando.join(', ')}` });

    const usuarioExistente = await get('SELECT id FROM usuarios WHERE lower(usuario) = lower(?)', [usuario]);
    if (usuarioExistente) return res.status(409).json({ erro: 'Esse usuário já existe.' });

    const pacienteExistente = await all('SELECT cpf FROM pacientes');
    if (pacienteExistente.some(p => onlyNumbers(p.cpf) === onlyNumbers(cpf))) {
      return res.status(409).json({ erro: 'Já existe um cadastro com esse CPF.' });
    }

    const result = await run(
      'INSERT INTO usuarios (usuario, senha, tipo, nome, cpf, clinica) VALUES (?, ?, ?, ?, ?, ?)',
      [usuario, senha, 'paciente', nome, cpf, clinica]
    );
    await run('INSERT INTO pacientes (nome, cpf, usuario, clinica) VALUES (?, ?, ?, ?)', [nome, cpf, usuario, clinica]);

    const novoUsuario = await get('SELECT id, usuario, tipo, nome, cpf, clinica FROM usuarios WHERE id = ?', [result.id]);
    res.status(201).json({ usuario: novoUsuario, paciente: { nome, cpf, usuario, clinica } });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
  }
});

app.get('/usuarios', async (req, res) => {
  const usuarios = await all('SELECT id, usuario, tipo, nome, cpf, clinica FROM usuarios ORDER BY id DESC');
  res.json(usuarios);
});

app.get('/pacientes', async (req, res) => {
  const pacientes = await all('SELECT id, nome, cpf, usuario, clinica FROM pacientes ORDER BY nome');
  res.json(pacientes);
});

app.post('/consultas', async (req, res) => {
  try {
    const faltando = validarCamposObrigatorios(req.body, ['paciente', 'cpf', 'usuarioPaciente', 'dentista', 'data', 'hora', 'clinica']);
    if (faltando.length) return res.status(400).json({ erro: `Campos obrigatórios: ${faltando.join(', ')}` });

    const nova = {
      paciente: req.body.paciente,
      cpf: req.body.cpf,
      usuarioPaciente: req.body.usuarioPaciente,
      dentista: req.body.dentista,
      data: req.body.data,
      hora: req.body.hora,
      clinica: req.body.clinica,
      sincronizado: 0,
      status: 'agendada'
    };

    if (dataHoraNoPassado(nova.data, nova.hora)) {
      return res.status(400).json({ erro: 'Não é possível agendar para uma data ou horário que já passou.' });
    }

    const conflitoDentista = await get(
      `SELECT id FROM consultas
       WHERE status != 'cancelada' AND dentista = ? AND data = ? AND hora = ? AND clinica = ?`,
      [nova.dentista, nova.data, nova.hora, nova.clinica]
    );
    if (conflitoDentista) return res.status(409).json({ erro: 'Horário ocupado para este dentista. Escolha outro.' });

    const conflitoPaciente = await get(
      `SELECT id FROM consultas
       WHERE status != 'cancelada' AND usuarioPaciente = ? AND data = ? AND hora = ?`,
      [nova.usuarioPaciente, nova.data, nova.hora]
    );
    if (conflitoPaciente) return res.status(409).json({ erro: 'Paciente já possui consulta nesse horário.' });

    const result = await run(
      `INSERT INTO consultas
       (paciente, cpf, usuarioPaciente, dentista, data, hora, clinica, sincronizado, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nova.paciente, nova.cpf, nova.usuarioPaciente, nova.dentista, nova.data, nova.hora, nova.clinica, 0, 'agendada']
    );

    const pacientes = await all('SELECT cpf FROM pacientes');
    if (!pacientes.some(p => onlyNumbers(p.cpf) === onlyNumbers(nova.cpf))) {
      await run('INSERT INTO pacientes (nome, cpf, usuario, clinica) VALUES (?, ?, ?, ?)',
        [nova.paciente, nova.cpf, nova.usuarioPaciente, nova.clinica]);
    }

    const criada = await get('SELECT * FROM consultas WHERE id = ?', [result.id]);
    res.status(201).json(mapConsulta(criada));
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao criar consulta.' });
  }
});

app.get('/consultas', async (req, res) => {
  const { usuarioPaciente } = req.query;
  const rows = usuarioPaciente
    ? await all('SELECT * FROM consultas WHERE usuarioPaciente = ? ORDER BY data, hora', [usuarioPaciente])
    : await all('SELECT * FROM consultas ORDER BY data, hora');
  res.json(rows.map(mapConsulta));
});

app.put('/consultas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const consulta = await get('SELECT * FROM consultas WHERE id = ?', [id]);
    if (!consulta) return res.status(404).json({ erro: 'Consulta não encontrada.' });

    const atualizada = { ...consulta, ...req.body };
    if (dataHoraNoPassado(atualizada.data, atualizada.hora)) {
      return res.status(400).json({ erro: 'Não é possível remarcar para data ou horário passado.' });
    }

    const sincronizado = typeof req.body.sincronizado === 'boolean'
      ? (req.body.sincronizado ? 1 : 0)
      : 0;

    await run(
      `UPDATE consultas SET paciente = ?, cpf = ?, usuarioPaciente = ?, dentista = ?, data = ?, hora = ?, clinica = ?, sincronizado = ?, status = ? WHERE id = ?`,
      [atualizada.paciente, atualizada.cpf, atualizada.usuarioPaciente, atualizada.dentista, atualizada.data, atualizada.hora, atualizada.clinica, sincronizado, atualizada.status, id]
    );
    const row = await get('SELECT * FROM consultas WHERE id = ?', [id]);
    res.json(mapConsulta(row));
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao atualizar consulta.' });
  }
});

app.delete('/consultas/:id', async (req, res) => {
  const id = Number(req.params.id);
  const consulta = await get('SELECT * FROM consultas WHERE id = ?', [id]);
  if (!consulta) return res.status(404).json({ erro: 'Consulta não encontrada.' });
  await run("UPDATE consultas SET status = 'cancelada', sincronizado = 0 WHERE id = ?", [id]);
  const row = await get('SELECT * FROM consultas WHERE id = ?', [id]);
  res.json({ mensagem: 'Consulta cancelada.', consulta: mapConsulta(row) });
});

app.post('/prontuarios', async (req, res) => {
  try {
    const faltando = validarCamposObrigatorios(req.body, ['paciente', 'procedimento', 'descricao']);
    if (faltando.length) return res.status(400).json({ erro: `Campos obrigatórios: ${faltando.join(', ')}` });

    const result = await run(
      'INSERT INTO prontuarios (paciente, cpf, usuarioPaciente, procedimento, descricao) VALUES (?, ?, ?, ?, ?)',
      [req.body.paciente, req.body.cpf || null, req.body.usuarioPaciente || null, req.body.procedimento, req.body.descricao]
    );
    const prontuario = await get('SELECT * FROM prontuarios WHERE id = ?', [result.id]);
    res.status(201).json(prontuario);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao cadastrar prontuário.' });
  }
});


app.get('/prontuarios', async (req, res) => {
  const prontuarios = await all('SELECT * FROM prontuarios ORDER BY id DESC');
  res.json(prontuarios);
});

app.get('/prontuarios/:pacienteId', async (req, res) => {
  const pacienteId = req.params.pacienteId;
  const todos = await all('SELECT * FROM prontuarios ORDER BY id DESC');
  const prontuarios = todos.filter(p => p.usuarioPaciente === pacienteId || onlyNumbers(p.cpf) === onlyNumbers(pacienteId));
  res.json(prontuarios);
});

app.post('/sync/consulta', async (req, res) => {
  try {
    const c = req.body;
    if (!c.id) return res.status(400).json({ erro: 'Consulta sem ID para sincronizar.' });

    const existe = await get('SELECT id FROM consultas WHERE id = ?', [c.id]);
    if (existe) {
      await run(
        `UPDATE consultas SET paciente = ?, cpf = ?, usuarioPaciente = ?, dentista = ?, data = ?, hora = ?, clinica = ?, sincronizado = 1, status = ? WHERE id = ?`,
        [c.paciente, c.cpf, c.usuarioPaciente, c.dentista, c.data, c.hora, c.clinica, c.status || 'agendada', c.id]
      );
    } else {
      await run(
        `INSERT INTO consultas (id, paciente, cpf, usuarioPaciente, dentista, data, hora, clinica, sincronizado, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [c.id, c.paciente, c.cpf, c.usuarioPaciente, c.dentista, c.data, c.hora, c.clinica, c.status || 'agendada']
      );
    }
    const consulta = await get('SELECT * FROM consultas WHERE id = ?', [c.id]);
    res.status(201).json({ mensagem: 'Consulta sincronizada.', consulta: mapConsulta(consulta) });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao sincronizar consulta.' });
  }
});

app.post('/sync/paciente', async (req, res) => {
  try {
    const paciente = req.body;
    if (!paciente.cpf) return res.status(400).json({ erro: 'Paciente sem CPF para sincronizar.' });
    const pacientes = await all('SELECT cpf FROM pacientes');
    const existe = pacientes.some(p => onlyNumbers(p.cpf) === onlyNumbers(paciente.cpf));
    if (!existe) {
      await run('INSERT INTO pacientes (nome, cpf, usuario, clinica) VALUES (?, ?, ?, ?)',
        [paciente.nome, paciente.cpf, paciente.usuario, paciente.clinica]);
    }
    res.status(201).json({ mensagem: existe ? 'Paciente já existia.' : 'Paciente sincronizado.', paciente });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao sincronizar paciente.' });
  }
});

app.post('/reset-demo', async (req, res) => {
  try {
    await run('DELETE FROM prontuarios');
    await run('DELETE FROM consultas');
    await run('DELETE FROM pacientes');
    await run('DELETE FROM usuarios');
    await run('DELETE FROM sqlite_sequence');
    await initDatabase();
    res.json({ mensagem: 'Dados de demonstração restaurados.' });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao restaurar demonstração.' });
  }
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`API ${CLINICA} rodando em http://localhost:${PORT}`);
    console.log(`Banco SQLite: ${DB_FILE}`);
  });
});
