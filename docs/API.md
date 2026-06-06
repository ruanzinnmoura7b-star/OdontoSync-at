# API OdontoSync

A API do OdontoSync foi implementada em Node.js com Express e SQLite.

## Base URLs

```txt
Clínica A: http://localhost:3000
Clínica B: http://localhost:3001
```

Cada clínica usa um banco SQLite próprio.

## Usuários

### POST /login

Autentica um usuário.

Exemplo de corpo:

```json
{
  "usuario": "doutor",
  "senha": "123"
}
```

### POST /usuarios

Cadastra um paciente.

```json
{
  "nome": "Maria Silva",
  "cpf": "12345678900",
  "usuario": "maria",
  "senha": "123456",
  "clinica": "Clínica A"
}
```

### GET /usuarios

Lista os usuários cadastrados.

### GET /pacientes

Lista os pacientes cadastrados.

## Consultas

### POST /consultas

Cria uma consulta.

```json
{
  "paciente": "Maria Silva",
  "cpf": "12345678900",
  "usuarioPaciente": "maria",
  "dentista": "Dra. Fernanda",
  "data": "2026-06-20",
  "hora": "09:00",
  "clinica": "Clínica A"
}
```

### GET /consultas

Lista as consultas.

### PUT /consultas/:id

Remarca ou atualiza uma consulta.

### DELETE /consultas/:id

Cancela uma consulta.

## Prontuários

### POST /prontuarios

Cadastra um prontuário.

### GET /prontuarios

Lista todos os prontuários.

### GET /prontuarios/:pacienteId

Lista prontuários por usuário ou CPF.

## Sincronização

### POST /sync/consulta

Recebe uma consulta replicada de outra clínica.

### POST /sync/paciente

Recebe um paciente replicado de outra clínica.
