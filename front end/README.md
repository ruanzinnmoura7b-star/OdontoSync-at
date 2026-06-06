# OdontoSync

Sistema acadêmico de agendamento odontológico com front-end em HTML/CSS/JavaScript e back-end em Node.js, Express e SQLite.

O projeto simula uma arquitetura distribuída com duas clínicas odontológicas independentes, cada uma rodando em uma porta diferente e usando seu próprio banco de dados SQLite.

## Funcionalidades

- Login de doutor e paciente
- Cadastro de pacientes
- Agendamento de consultas
- Visualização de consultas do paciente
- Visualização de pacientes e consultas pelo doutor
- Cadastro e visualização de prontuários
- Cancelamento e remarcação de consultas
- Simulação de sincronização entre Clínica A e Clínica B
- Persistência dos dados em SQLite
- API REST com endpoints para usuários, pacientes, consultas, prontuários e sincronização

## Tecnologias

### Front-end

- HTML5
- CSS3
- JavaScript puro
- Fetch API

### Back-end

- Node.js
- Express
- SQLite
- CORS

## Estrutura do projeto

```txt
OdontoSync/
├── index.html
├── style.css
├── odonto-auth.css
├── script.js
├── README.md
├── .gitignore
│
├── backend/
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       ├── server.js
│       ├── db.js
│       ├── validations.js
│       └── data/
│           ├── clinica-a.sqlite
│           └── clinica-b.sqlite
│
└── docs/
    ├── API.md
    └── DOCUMENTACAO.md
```

> Os arquivos `.sqlite` são criados automaticamente quando o backend é executado.

## Como executar

### 1. Instalar dependências do backend

Abra o terminal na pasta do projeto e rode:

```bash
cd backend
npm install
```

### 2. Rodar a Clínica A

No Windows:

```bash
npm run dev:win:a
```

No Linux/Mac:

```bash
npm run dev:a
```

A Clínica A ficará disponível em:

```txt
http://localhost:3000
```

### 3. Rodar a Clínica B

Abra outro terminal na pasta do projeto e rode:

```bash
cd backend
npm run dev:win:b
```

No Linux/Mac:

```bash
npm run dev:b
```

A Clínica B ficará disponível em:

```txt
http://localhost:3001
```

### 4. Abrir o front-end

Abra o arquivo `index.html` com a extensão **Live Server** do VS Code.

## Acessos de teste

### Doutor

```txt
Usuário: doutor
Senha: 123
```

### Paciente

```txt
Usuário: paciente
Senha: 123
```

## Bancos de dados

Cada clínica possui seu próprio banco:

```txt
Clínica A → backend/src/data/clinica-a.sqlite
Clínica B → backend/src/data/clinica-b.sqlite
```

Os dados continuam salvos mesmo depois de fechar o navegador, o VS Code ou desligar o computador.

## Endpoints principais

### Usuários

```http
POST /login
POST /usuarios
GET  /usuarios
GET  /pacientes
```

### Consultas

```http
POST   /consultas
GET    /consultas
PUT    /consultas/:id
DELETE /consultas/:id
```

### Prontuários

```http
POST /prontuarios
GET  /prontuarios
GET  /prontuarios/:pacienteId
```

### Sincronização

```http
POST /sync/consulta
POST /sync/paciente
```

## Como visualizar os dados

Com os servidores rodando, acesse no navegador:

### Clínica A

```txt
http://localhost:3000/usuarios
http://localhost:3000/pacientes
http://localhost:3000/consultas
http://localhost:3000/prontuarios
```

### Clínica B

```txt
http://localhost:3001/usuarios
http://localhost:3001/pacientes
http://localhost:3001/consultas
http://localhost:3001/prontuarios
```

Também é possível abrir os arquivos `.sqlite` no VS Code usando extensões como **SQLite Viewer** ou **SQLite Explorer**.

## Conceitos de Sistemas Distribuídos aplicados

- Dois nós independentes: Clínica A e Clínica B
- Bancos separados por nó
- Comunicação via API REST
- Sincronização entre clínicas
- Consistência eventual
- Simulação de clínica online/offline
- Persistência de dados fora do navegador

## Observação importante

O projeto não utiliza mais `localStorage` como banco principal. O front-end se comunica com o backend usando `fetch()`, e o backend salva os dados no SQLite.
