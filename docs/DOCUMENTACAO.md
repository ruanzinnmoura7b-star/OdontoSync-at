# Documentação do Projeto OdontoSync

## Visão geral

O OdontoSync é um protótipo acadêmico de sistema distribuído para clínicas odontológicas. O sistema possui front-end em HTML/CSS/JavaScript e back-end em Node.js, Express e SQLite.

O objetivo é simular duas clínicas independentes que funcionam como nós distribuídos.

## Entidades principais

### Usuário

Representa quem acessa o sistema.

Campos principais:

- usuario
- senha
- tipo
- nome
- cpf
- clinica

### Paciente

Representa uma pessoa cadastrada para agendamento.

Campos principais:

- nome
- cpf
- usuario
- clinica

### Consulta

Representa o agendamento odontológico.

Campos principais:

- id
- paciente
- cpf
- usuarioPaciente
- dentista
- data
- hora
- clinica
- sincronizado
- status

### Prontuário

Representa o histórico clínico do paciente.

Campos principais:

- paciente
- cpf
- usuarioPaciente
- procedimento
- descricao

## Regras aplicadas

- Paciente só visualiza as próprias consultas.
- Doutor visualiza pacientes, consultas e prontuários.
- Não é permitido agendar datas ou horários passados.
- Não é permitido marcar duas consultas para o mesmo dentista, clínica, data e horário.
- Não é permitido o mesmo paciente marcar duas consultas no mesmo horário.
- Consultas novas e remarcadas ficam pendentes de sincronização.
- Clínica A e Clínica B possuem bancos SQLite separados.

## Simulação distribuída

O sistema considera:

```txt
Clínica A: http://localhost:3000
Clínica B: http://localhost:3001
```

Cada clínica possui banco próprio:

```txt
clinica-a.sqlite
clinica-b.sqlite
```

A sincronização é feita por endpoints específicos, simulando replicação entre nós.

## Como explicar ao professor

O sistema foi dividido em front-end e back-end. O front-end envia requisições HTTP usando `fetch()`. O back-end recebe essas requisições em endpoints REST e salva os dados em bancos SQLite.

A parte distribuída é representada por duas APIs rodando em portas diferentes. Cada API representa uma clínica independente.
