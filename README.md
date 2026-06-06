# 🦷 OdontoSync

Sistema distribuído para gerenciamento odontológico desenvolvido como projeto acadêmico da disciplina de Sistemas Distribuídos.

## 📌 Sobre o Projeto

O OdontoSync simula duas clínicas odontológicas independentes que compartilham informações através de APIs REST. O objetivo é demonstrar conceitos de sistemas distribuídos, sincronização de dados, persistência em banco de dados e comunicação entre nós.

---

## 🚀 Tecnologias Utilizadas

### Front-end

* HTML5
* CSS3
* JavaScript

### Back-end

* Node.js
* Express
* SQLite

---

## 🏥 Estrutura das Clínicas

O sistema simula duas clínicas:

### Clínica A

* Porta: 3000
* Banco: `clinica-a.sqlite`

### Clínica B

* Porta: 3001
* Banco: `clinica-b.sqlite`

Cada clínica possui seu próprio banco de dados SQLite.

---

## ✅ Funcionalidades

* Cadastro de pacientes
* Login de usuários
* Agendamento de consultas
* Visualização de consultas
* Remarcação e cancelamento de consultas
* Prontuários odontológicos
* Persistência de dados em SQLite
* Sincronização entre clínicas
* Simulação de clínicas online e offline
* APIs REST para comunicação entre os nós

---

## 📂 Estrutura do Projeto

```text
OdontoSync/
│
├── index.html
├── script.js
├── style.css
├── odonto-auth.css
│
├── README.md
├── DOCUMENTACAO.md
├── API_FUTURA.md
│
└── backend/
    ├── package.json
    ├── package-lock.json
    │
    └── src/
        ├── server.js
        ├── db.js
        ├── validations.js
        │
        └── data/
            ├── clinica-a.sqlite
            └── clinica-b.sqlite
```

---

## ▶️ Como Executar

### Instalar dependências

Entre na pasta backend:

```bash
cd backend
npm install
```

---

### Iniciar Clínica A

Windows:

```bash
npm run dev:win:a
```

Disponível em:

```text
http://localhost:3000
```

---

### Iniciar Clínica B

Abra outro terminal e execute:

```bash
npm run dev:win:b
```

Disponível em:

```text
http://localhost:3001
```

---

## 🔌 Endpoints Implementados

### Usuários

```http
POST /login
POST /usuarios
GET /usuarios
GET /pacientes
```

### Consultas

```http
POST /consultas
GET /consultas
PUT /consultas/:id
DELETE /consultas/:id
```

### Prontuários

```http
POST /prontuarios
GET /prontuarios/:pacienteId
```

### Sincronização

```http
POST /sync/paciente
POST /sync/consulta
```

---

## 💾 Banco de Dados

O sistema utiliza SQLite para armazenamento permanente dos dados.

Arquivos de banco:

```text
backend/src/data/clinica-a.sqlite
backend/src/data/clinica-b.sqlite
```

Os dados permanecem salvos mesmo após fechar o sistema ou reiniciar o computador.

---

## 🎓 Conceitos Aplicados

* Sistemas Distribuídos
* Arquitetura Cliente-Servidor
* APIs REST
* Persistência de Dados
* Banco de Dados SQLite
* Sincronização entre Nós
* Comunicação entre Serviços
* Node.js e Express

---

## 👨‍💻 Autor

Ruan Carlos Moura de Arruda

Curso: Ciência da Computação

Faculdade Internacional da Paraíba (FPB)
