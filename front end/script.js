// Toggle mostrar/ocultar senha
function toggleSenha(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector("i");
  if (input.type === "password") {
    input.type = "text";
    icon.className = "ti ti-eye-off";
  } else {
    input.type = "password";
    icon.className = "ti ti-eye";
  }
}

// =============================================
//  API / BANCO DE DADOS NO BACKEND
// =============================================

const API_CLINICA_A = "http://localhost:3000";
const API_CLINICA_B = "http://localhost:3001";
let API_BASE = API_CLINICA_A;

let usuarios = [];
let pacientes = [];
let consultas = [];
let prontuarios = [];
let consultaIdCounter = 1;
let ultimaSincronizacao = null;
let noRemotoOnline = true;

function apiDaClinica(clinica) {
  return clinica === "Clínica B" ? API_CLINICA_B : API_CLINICA_A;
}

function apiDaConsulta(consulta) {
  return consulta?.origemApi || apiDaClinica(consulta?.clinica);
}

function origemInline(consulta) {
  return apiDaConsulta(consulta).replace(/'/g, "\\'");
}

function removerDuplicados(lista, chaveFn) {
  const mapa = new Map();
  for (const item of lista) {
    const chave = chaveFn(item);
    if (!mapa.has(chave)) mapa.set(chave, item);
  }
  return Array.from(mapa.values());
}

async function apiRequest(path, options = {}, base = API_BASE) {
  const resposta = await fetch(base + path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  let dados = null;
  try { dados = await resposta.json(); } catch (_) {}

  if (!resposta.ok) {
    throw new Error(dados?.erro || dados?.mensagem || "Erro ao comunicar com a API.");
  }

  return dados;
}

async function carregarDadosApi() {
  const bases = [API_CLINICA_A, API_CLINICA_B];
  const resultado = {
    usuarios: [],
    pacientes: [],
    consultas: [],
    prontuarios: []
  };

  for (const base of bases) {
    try {
      const [u, p, c, pr] = await Promise.all([
        apiRequest("/usuarios", {}, base),
        apiRequest("/pacientes", {}, base),
        apiRequest("/consultas", {}, base),
        apiRequest("/prontuarios", {}, base)
      ]);

      resultado.usuarios.push(...u.map(item => ({ ...item, origemApi: base })));
      resultado.pacientes.push(...p.map(item => ({ ...item, origemApi: base })));
      resultado.consultas.push(...c.map(item => ({ ...item, origemApi: base })));
      resultado.prontuarios.push(...pr.map(item => ({ ...item, origemApi: base })));
    } catch (_) {
      // Se uma clínica estiver offline, o sistema continua funcionando com a outra.
    }
  }

  usuarios = removerDuplicados(resultado.usuarios, item => item.usuario + "|" + (item.cpf || ""));
  pacientes = removerDuplicados(resultado.pacientes, item => (item.cpf || item.usuario));
  consultas = resultado.consultas.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  prontuarios = resultado.prontuarios;
}

async function testarClinicaBOnline() {
  try {
    await fetch(API_CLINICA_B + "/", { method: "GET" });
    noRemotoOnline = true;
  } catch (_) {
    noRemotoOnline = false;
  }
}

// =============================================
//  SESSÃO ATUAL
// =============================================

let sessaoAtual = null;

// =============================================
//  LOGIN
// =============================================

document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const usuario = document.getElementById("loginUser").value.trim();
  const senha   = document.getElementById("loginPassword").value;

  try {
    // Tenta primeiro na Clínica A. Se não encontrar, tenta na Clínica B.
    let resposta;
    try {
      resposta = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({ usuario, senha })
      }, API_CLINICA_A);
      API_BASE = API_CLINICA_A;
    } catch (erroA) {
      resposta = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({ usuario, senha })
      }, API_CLINICA_B);
      API_BASE = API_CLINICA_B;
    }

    const encontrado = resposta.usuario;
    sessaoAtual = {
      usuario: encontrado.usuario,
      tipo: encontrado.tipo,
      nome: encontrado.nome || encontrado.usuario,
      cpf: encontrado.cpf || null,
      clinica: encontrado.clinica || null
    };

    await carregarDadosApi();
    await testarClinicaBOnline();

    limparErro("loginError");
    this.reset();
    entrarSistema(encontrado.tipo);
  } catch (erro) {
    mostrarErro("loginError", erro.message || "Usuário ou senha incorretos.");
  }
});

// =============================================
//  CADASTRO
// =============================================

function abrirCadastro() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("registerScreen").classList.remove("hidden");
}

function voltarParaLogin() {
  document.getElementById("registerScreen").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  limparErro("registerError");
}

document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const nome    = document.getElementById("registerName").value.trim();
  const cpf     = document.getElementById("registerCpf").value.trim();
  const usuario = document.getElementById("registerUser").value.trim();
  const senha   = document.getElementById("registerPassword").value;
  const clinica = document.getElementById("registerClinic").value;

  if (nome.split(" ").filter(Boolean).length < 2) {
    mostrarErro("registerError", "Informe nome e sobrenome.");
    return;
  }

  if (!validarCPFSimples(cpf)) {
    mostrarErro("registerError", "CPF inválido. Digite 11 números.");
    return;
  }

  if (!validarUsuario(usuario)) {
    mostrarErro("registerError", "O usuário deve ter 4 a 20 caracteres e usar apenas letras, números, ponto, hífen ou underline.");
    return;
  }

  if (!validarSenha(senha)) {
    mostrarErro("registerError", "A senha deve ter pelo menos 6 caracteres e não pode conter espaços.");
    return;
  }

  try {
    API_BASE = apiDaClinica(clinica);
    await apiRequest("/usuarios", {
      method: "POST",
      body: JSON.stringify({ nome, cpf, usuario, senha, tipo: "paciente", clinica })
    });

    await carregarDadosApi();
    limparErro("registerError");
    this.reset();
    mostrarToast("Cadastro realizado! Faça login.");
    voltarParaLogin();
  } catch (erro) {
    mostrarErro("registerError", erro.message);
  }
});

// =============================================
//  ENTRAR / SAIR
// =============================================

function entrarSistema(tipo) {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("systemScreen").classList.remove("hidden");

  document.getElementById("userDisplayName").innerText = sessaoAtual.nome;
  document.getElementById("userInitials").innerText    = iniciais(sessaoAtual.nome);
  document.getElementById("userTypeText2").innerText   = tipo === "doutor" ? "Doutor" : "Paciente";

  if (tipo === "doutor") {
    document.getElementById("doctorMenu").classList.remove("hidden");
    document.getElementById("patientMenu").classList.add("hidden");
    document.getElementById("userTypeText").innerText = "Painel do Doutor";
    mostrarPaginaInicial("dashboardDoctor");
  } else {
    document.getElementById("patientMenu").classList.remove("hidden");
    document.getElementById("doctorMenu").classList.add("hidden");
    document.getElementById("userTypeText").innerText = "Painel do Paciente";
    preencherDadosPaciente();
    mostrarPaginaInicial("dashboardPatient");
  }

  atualizarSistema();
}

function abrirModalLogout() {
  const info = document.getElementById("logoutUserInfo");
  if (info && sessaoAtual) {
    info.innerHTML = `
      <div class="logout-avatar">${iniciais(sessaoAtual.nome)}</div>
      <div>
        <div class="logout-name">${sessaoAtual.nome}</div>
        <div class="logout-role">${sessaoAtual.tipo === 'doutor' ? 'Médico / Administrador' : 'Paciente'}</div>
      </div>`;
  }
  document.getElementById("modalLogout").classList.remove("hidden");
  document.getElementById("modalOverlay").classList.remove("hidden");
}

function fecharModalLogout() {
  document.getElementById("modalLogout").classList.add("hidden");
  document.getElementById("modalOverlay").classList.add("hidden");
}

function confirmarLogout() {
  fecharModalLogout();
  sessaoAtual = null;
  document.getElementById("systemScreen").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
  const first = document.querySelector(".menu-btn");
  if (first) first.classList.add("active");
}

function sairSistema() {
  abrirModalLogout();
}

// =============================================
//  NAVEGAÇÃO
// =============================================

// =============================================
//  SIDEBAR MOBILE
// =============================================

function abrirSidebar() {
  document.querySelector(".sidebar").classList.add("sidebar-open");
  const overlay = document.getElementById("sidebarOverlay");
  overlay.style.display = "block";
  requestAnimationFrame(() => overlay.classList.add("active"));
}

function fecharSidebar() {
  document.querySelector(".sidebar").classList.remove("sidebar-open");
  const overlay = document.getElementById("sidebarOverlay");
  overlay.classList.remove("active");
  setTimeout(() => { overlay.style.display = "none"; }, 250);
}

function mostrarTela(id, botao) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
  document.getElementById(id).classList.add("active-page");
  document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
  botao.classList.add("active");
  alterarTitulo(id);
  // Fecha sidebar automaticamente no mobile ao navegar
  if (window.innerWidth <= 768) fecharSidebar();
}

function mostrarPaginaInicial(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
  document.getElementById(id).classList.add("active-page");
  alterarTitulo(id);
}

function alterarTitulo(id) {
  const titulos = {
    dashboardDoctor:    "Dashboard",
    appointmentsDoctor: "Agendamentos",
    patientsDoctor:     "Pacientes",
    recordsDoctor:      "Prontuários",
    syncDoctor:         "Sincronização",
    dataDoctor:         "Dados",
    dashboardPatient:   "Início",
    schedulePatient:    "Agendar Consulta",
    consultsPatient:    "Minhas Consultas"
  };
  document.getElementById("pageTitle").innerText = titulos[id] || "";
}

// =============================================
//  ATUALIZAR SISTEMA
// =============================================

function atualizarSistema() {
  atualizarCards();
  atualizarTabelaConsultasDoutor();
  atualizarTabelaPacientes();
  atualizarProntuarios();
  atualizarConsultasPaciente();
  atualizarProximaConsulta();
  atualizarAgendaHoje();
  atualizarSincronizacao();
}

// =============================================
//  DASHBOARD
// =============================================

function atualizarCards() {
  document.getElementById("patientsCount").innerText = pacientes.length;
  document.getElementById("consultsCount").innerText = consultas.filter(c => c.status !== "cancelada").length;
  document.getElementById("recordsCount").innerText  = prontuarios.length;

  const pendingEl = document.getElementById("pendingSyncCount");
  const canceledEl = document.getElementById("canceledCount");

  if (pendingEl) {
    pendingEl.innerText = consultas.filter(c => c.status !== "cancelada" && !c.sincronizado).length;
  }

  if (canceledEl) {
    canceledEl.innerText = consultas.filter(c => c.status === "cancelada").length;
  }
}

// =============================================
//  TABELA DOUTOR — todas as consultas
// =============================================

function atualizarTabelaConsultasDoutor() {
  const tabela = document.getElementById("doctorAppointmentsTable");
  tabela.innerHTML = "";

  const ordenadas = [...consultas].sort((a, b) =>
    new Date(a.data + "T" + a.hora) - new Date(b.data + "T" + b.hora)
  );

  if (!ordenadas.length) {
    tabela.innerHTML = `<tr><td colspan="7" class="empty-row">Nenhuma consulta agendada.</td></tr>`;
    return;
  }

  ordenadas.forEach(c => {
    const cancelada = c.status === "cancelada";
    tabela.innerHTML += `
      <tr class="${cancelada ? 'row-cancelada' : ''}">
        <td>
          <div class="patient-cell">
            <div class="patient-avatar">${iniciais(c.paciente)}</div>
            ${c.paciente}
          </div>
        </td>
        <td><span class="doctor-name">${c.dentista}</span></td>
        <td>${formatarData(c.data)}</td>
        <td>${c.hora}</td>
        <td>${c.clinica}</td>
        <td>
          <span class="status ${c.sincronizado ? 'ok' : 'pending'}">
            ${c.sincronizado ? '✓ Sinc.' : '⏳ Pend.'}
          </span>
        </td>
        <td>
          ${cancelada
            ? `<span class="status cancelado">✕ Cancelada</span>`
            : `<button class="btn-table-action btn-cancel" onclick="confirmarCancelamento(${c.id}, '${origemInline(c)}')">Cancelar</button>`
          }
        </td>
      </tr>`;
  });
}

// =============================================
//  TABELA PACIENTES — doutor vê todos
// =============================================

function atualizarTabelaPacientes() {
  const tabela = document.getElementById("doctorPatientsTable");
  tabela.innerHTML = "";

  if (!pacientes.length) {
    tabela.innerHTML = `<tr><td colspan="3" class="empty-row">Nenhum paciente cadastrado.</td></tr>`;
    return;
  }

  pacientes.forEach(p => {
    tabela.innerHTML += `
      <tr>
        <td>
          <div class="patient-cell">
            <div class="patient-avatar">${iniciais(p.nome)}</div>
            ${p.nome}
          </div>
        </td>
        <td>${p.cpf}</td>
        <td>${p.clinica}</td>
      </tr>`;
  });
}

// =============================================
//  PRONTUÁRIOS
// =============================================

function atualizarProntuarios() {
  const lista = document.getElementById("recordsList");
  lista.innerHTML = "";

  if (!prontuarios.length) {
    lista.innerHTML = `<p class="empty-msg">Nenhum prontuário registrado.</p>`;
    return;
  }

  prontuarios.forEach(pr => {
    lista.innerHTML += `
      <div class="record-item">
        <h3>${pr.paciente}</h3>
        <p><strong>Procedimento:</strong> ${pr.procedimento}</p>
        <p>${pr.descricao}</p>
      </div>`;
  });
}

// =============================================
//  CONSULTAS DO PACIENTE — só as DELE
// =============================================

function consultasDoUsuario() {
  if (!sessaoAtual) return [];
  return consultas.filter(c => c.usuarioPaciente === sessaoAtual.usuario);
}

function atualizarConsultasPaciente() {
  const tabela = document.getElementById("patientAppointmentsTable");
  tabela.innerHTML = "";

  const minhas = [...consultasDoUsuario()].sort((a, b) =>
    new Date(a.data + "T" + a.hora) - new Date(b.data + "T" + b.hora)
  );

  if (!minhas.length) {
    tabela.innerHTML = `<tr><td colspan="6" class="empty-row">Você ainda não tem consultas agendadas.</td></tr>`;
    return;
  }

  minhas.forEach(c => {
    const cancelada = c.status === "cancelada";
    let acoes = `<span class="status cancelado">✕ Cancelada</span>`;
    if (!cancelada) {
      acoes = `
        <div class="action-btns">
          <button class="btn-table-action btn-reschedule" onclick="abrirRemarcar(${c.id}, '${origemInline(c)}')">Remarcar</button>
          <button class="btn-table-action btn-cancel" onclick="confirmarCancelamento(${c.id}, '${origemInline(c)}')">Cancelar</button>
        </div>`;
    }

    tabela.innerHTML += `
      <tr class="${cancelada ? 'row-cancelada' : ''}">
        <td>
          <div class="patient-cell">
            <div class="patient-avatar">${iniciais(c.paciente)}</div>
            ${c.paciente}
          </div>
        </td>
        <td><span class="doctor-name">${c.dentista}</span></td>
        <td>${formatarData(c.data)}</td>
        <td>${c.hora}</td>
        <td>${c.clinica}</td>
        <td>${acoes}</td>
      </tr>`;
  });
}

// =============================================
//  PRÓXIMA CONSULTA
// =============================================

function atualizarProximaConsulta() {
  const titulo = document.getElementById("nextAppointmentTitle");
  const texto  = document.getElementById("nextAppointmentText");
  if (!titulo || !texto) return;

  const agora   = new Date();
  const futuras = consultasDoUsuario()
    .filter(c => c.status !== "cancelada" && new Date(c.data + "T" + c.hora) >= agora)
    .sort((a, b) => new Date(a.data + "T" + a.hora) - new Date(b.data + "T" + b.hora));

  if (!futuras.length) {
    titulo.innerText = "Nenhuma consulta futura";
    texto.innerText  = "Agende uma consulta para vê-la aqui.";
    return;
  }

  const p = futuras[0];
  titulo.innerText = `${p.dentista} — ${p.clinica}`;
  texto.innerText  = `Marcada para ${formatarData(p.data)} às ${p.hora}.`;
}

// =============================================
//  AGENDA DE HOJE
// =============================================

function atualizarAgendaHoje() {
  const lista = document.getElementById("todayAppointmentsList");
  if (!lista) return;

  const hoje = new Date().toISOString().split("T")[0];
  const agendaHoje = consultas
    .filter(c => c.status !== "cancelada" && c.data === hoje)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  if (!agendaHoje.length) {
    lista.innerHTML = `<p class="empty-msg">Nenhuma consulta marcada para hoje.</p>`;
    return;
  }

  lista.innerHTML = agendaHoje.map(c => `
    <div class="today-item">
      <div>
        <strong>${c.hora}</strong> — ${c.paciente}
        <p>${c.dentista} · ${c.clinica}</p>
      </div>
      <span class="status ${c.sincronizado ? 'ok' : 'pending'}">
        ${c.sincronizado ? '✓ Sinc.' : '⏳ Pend.'}
      </span>
    </div>
  `).join("");
}

// =============================================
//  SINCRONIZAÇÃO
// =============================================

function atualizarSincronizacao() {
  const pendentes = consultas.filter(c => c.status !== "cancelada" && !c.sincronizado);
  const contador = document.getElementById("syncPendingCount");
  const ultima = document.getElementById("syncLastText");
  const tabela = document.getElementById("syncAppointmentsTable");
  const statusNo = document.getElementById("remoteNodeStatusText");
  const botaoNo = document.getElementById("nodeToggleButton");
  const statusTopo = document.querySelector(".clinic-status span");
  const statusDot = document.querySelector(".status-dot");

  if (contador) contador.innerText = pendentes.length;
  if (ultima) ultima.innerText = ultimaSincronizacao ? ultimaSincronizacao : "Ainda não realizada";
  if (statusNo) statusNo.innerText = noRemotoOnline ? "Clínica B online" : "Clínica B offline";
  if (botaoNo) botaoNo.innerText = noRemotoOnline ? "Simular Clínica B offline" : "Reativar Clínica B";
  if (statusTopo) statusTopo.innerText = noRemotoOnline ? "Clínicas sincronizadas" : "Clínica B offline";
  if (statusDot) statusDot.classList.toggle("status-dot-offline", !noRemotoOnline);

  if (!tabela) return;

  if (!consultas.length) {
    tabela.innerHTML = `<tr><td colspan="5" class="empty-row">Nenhuma consulta para sincronizar.</td></tr>`;
    return;
  }

  tabela.innerHTML = consultas.map(c => `
    <tr class="${c.status === 'cancelada' ? 'row-cancelada' : ''}">
      <td>${c.paciente}</td>
      <td>${c.clinica}</td>
      <td>${formatarData(c.data)}</td>
      <td>${c.hora}</td>
      <td>
        <span class="status ${c.sincronizado ? 'ok' : 'pending'}">
          ${c.sincronizado ? '✓ Sincronizada' : '⏳ Pendente'}
        </span>
      </td>
    </tr>
  `).join("");
}

async function sincronizarClinicas() {
  await testarClinicaBOnline();

  if (!noRemotoOnline) {
    mostrarToast("⚠️ Clínica B está offline. Os dados ficaram pendentes.");
    atualizarSistema();
    return;
  }

  const botao = document.getElementById("syncButton");
  if (botao) {
    botao.disabled = true;
    botao.innerText = "Sincronizando...";
  }

  try {
    const pendentes = consultas.filter(c => c.status !== "cancelada" && !c.sincronizado);

    for (const consulta of pendentes) {
      const destino = consulta.clinica === "Clínica B" ? API_CLINICA_A : API_CLINICA_B;
      const origem = apiDaConsulta(consulta);

      await apiRequest("/sync/consulta", {
        method: "POST",
        body: JSON.stringify(consulta)
      }, destino);

      await apiRequest(`/consultas/${consulta.id}`, {
        method: "PUT",
        body: JSON.stringify({ sincronizado: true })
      }, origem);
    }

    ultimaSincronizacao = new Date().toLocaleString("pt-BR");
    await carregarDadosApi();
    atualizarSistema();
    mostrarToast("🔄 Dados sincronizados entre as clínicas.");
  } catch (erro) {
    mostrarToast("Erro ao sincronizar: " + erro.message);
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.innerText = "Sincronizar Clínica A ↔ Clínica B";
    }
  }
}

function alternarNoRemoto() {
  noRemotoOnline = !noRemotoOnline;
  atualizarSistema();

  mostrarToast(noRemotoOnline
    ? "✅ Clínica B voltou a ficar online."
    : "⚠️ Clínica B ficou offline. Novas alterações ficarão pendentes."
  );
}

// =============================================
//  AGENDAR CONSULTA
// =============================================

function preencherDadosPaciente() {
  if (!sessaoAtual || sessaoAtual.tipo !== "paciente") return;
  const pac = pacientes.find(p => p.usuario === sessaoAtual.usuario);
  if (pac) {
    const fn = document.getElementById("appointmentPatient");
    const fc = document.getElementById("appointmentCpf");
    if (fn) { fn.value = pac.nome; fn.readOnly = true; }
    if (fc) { fc.value = pac.cpf;  fc.readOnly = true; }
  }
}

document.getElementById("appointmentForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  if (!sessaoAtual) return;

  const nova = {
    paciente:        document.getElementById("appointmentPatient").value.trim(),
    cpf:             document.getElementById("appointmentCpf").value.trim(),
    usuarioPaciente: sessaoAtual.usuario,
    dentista:        document.getElementById("appointmentDoctor").value,
    data:            document.getElementById("appointmentDate").value,
    hora:            document.getElementById("appointmentTime").value,
    clinica:         document.getElementById("appointmentClinic").value
  };

  if (!nova.data || !nova.hora) {
    mostrarErro("appointmentError", "Preencha a data e o horário.");
    return;
  }

  if (nova.clinica === "Clínica B" && !noRemotoOnline) {
    mostrarErro("appointmentError", "A Clínica B está offline no momento. Não é possível agendar consultas para ela.");
    return;
  }

  if (dataHoraNoPassado(nova.data, nova.hora)) {
    mostrarErro("appointmentError", "Não é possível agendar para uma data ou horário que já passou.");
    return;
  }

  try {
    API_BASE = apiDaClinica(nova.clinica);
    await apiRequest("/consultas", {
      method: "POST",
      body: JSON.stringify(nova)
    });

    await carregarDadosApi();
    limparErro("appointmentError");
    document.getElementById("appointmentDate").value = "";
    document.getElementById("appointmentTime").value = "";
    atualizarSistema();
    mostrarToast("✅ Consulta agendada com sucesso!");
  } catch (erro) {
    mostrarErro("appointmentError", erro.message);
  }
});

// =============================================
//  CANCELAR CONSULTA
// =============================================

function confirmarCancelamento(id, origemApi = null) {
  const c = consultas.find(x => Number(x.id) === Number(id) && (!origemApi || apiDaConsulta(x) === origemApi));
  if (!c) return;

  abrirModalConfirm({
    titulo:   "Cancelar consulta",
    corpo:    `Deseja cancelar a consulta de <strong>${c.paciente}</strong> com <strong>${c.dentista}</strong><br>em ${formatarData(c.data)} às ${c.hora}?`,
    labelOk:  "Sim, cancelar",
    classeOk: "btn-danger",
    onConfirm: async () => {
      try {
        API_BASE = apiDaConsulta(c);
        await apiRequest(`/consultas/${id}`, { method: "DELETE" });
        await carregarDadosApi();
        atualizarSistema();
        mostrarToast("Consulta cancelada.");
      } catch (erro) {
        mostrarToast("Erro ao cancelar: " + erro.message);
      }
    }
  });
}

// =============================================
//  REMARCAR CONSULTA
// =============================================

function abrirRemarcar(id, origemApi = null) {
  const c = consultas.find(x => Number(x.id) === Number(id) && (!origemApi || apiDaConsulta(x) === origemApi));
  if (!c) return;

  document.getElementById("remarcarId").value     = id;
  document.getElementById("remarcarId").dataset.origemApi = apiDaConsulta(c);
  document.getElementById("remarcarDoctor").value = c.dentista;
  document.getElementById("remarcarDate").value   = c.data;
  document.getElementById("remarcarTime").value   = c.hora;
  document.getElementById("remarcarClinic").value = c.clinica;
  document.getElementById("remarcarInfo").innerText =
    `Atual: ${c.dentista} · ${formatarData(c.data)} às ${c.hora} · ${c.clinica}`;

  limparErro("remarcarError");
  document.getElementById("modalRemarcar").classList.remove("hidden");
  document.getElementById("modalOverlay").classList.remove("hidden");
}

document.getElementById("remarcarForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const id = parseInt(document.getElementById("remarcarId").value);
  const origemApi = document.getElementById("remarcarId").dataset.origemApi || null;
  const c  = consultas.find(x => Number(x.id) === Number(id) && (!origemApi || apiDaConsulta(x) === origemApi));
  if (!c) return;

  const novaData     = document.getElementById("remarcarDate").value;
  const novaHora     = document.getElementById("remarcarTime").value;
  const novaDentista = document.getElementById("remarcarDoctor").value;
  const novaClinica  = document.getElementById("remarcarClinic").value;

  if (!novaData || !novaHora) {
    mostrarErro("remarcarError", "Preencha a nova data e o novo horário.");
    return;
  }

  if (novaClinica === "Clínica B" && !noRemotoOnline) {
    mostrarErro("remarcarError", "A Clínica B está offline no momento. Não é possível remarcar para ela.");
    return;
  }

  if (dataHoraNoPassado(novaData, novaHora)) {
    mostrarErro("remarcarError", "Não é possível remarcar para uma data ou horário que já passou.");
    return;
  }

  try {
    API_BASE = apiDaConsulta(c);
    await apiRequest(`/consultas/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        data: novaData,
        hora: novaHora,
        dentista: novaDentista,
        clinica: novaClinica
      })
    });

    API_BASE = apiDaClinica(novaClinica);
    await carregarDadosApi();
    fecharModais();
    atualizarSistema();
    mostrarToast("✅ Consulta remarcada com sucesso!");
  } catch (erro) {
    mostrarErro("remarcarError", erro.message);
  }
});

// =============================================
//  MODAIS
// =============================================

let _modalCallback = null;

function abrirModalConfirm({ titulo, corpo, labelOk = "Confirmar", classeOk = "", onConfirm }) {
  document.getElementById("modalConfirmTitle").innerText = titulo;
  document.getElementById("modalConfirmBody").innerHTML  = corpo;
  const btn = document.getElementById("modalConfirmOk");
  btn.innerText  = labelOk;
  btn.className  = "btn-modal-ok " + classeOk;
  _modalCallback = onConfirm;
  document.getElementById("modalConfirm").classList.remove("hidden");
  document.getElementById("modalOverlay").classList.remove("hidden");
}

document.getElementById("modalConfirmOk").addEventListener("click", async () => {
  if (_modalCallback) await _modalCallback();
  fecharModais();
});

document.getElementById("modalConfirmCancel").addEventListener("click", fecharModais);
document.getElementById("modalRemarcarCancel").addEventListener("click", fecharModais);
document.getElementById("modalOverlay").addEventListener("click", fecharModais);

function fecharModais() {
  document.getElementById("modalConfirm").classList.add("hidden");
  document.getElementById("modalRemarcar").classList.add("hidden");
  document.getElementById("modalLogout").classList.add("hidden");
  document.getElementById("modalOverlay").classList.add("hidden");
  _modalCallback = null;
}

// =============================================
//  PRONTUÁRIO
// =============================================

document.getElementById("recordForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const nomePaciente = document.getElementById("recordPatient").value.trim();
  const pac = pacientes.find(p => p.nome.toLowerCase() === nomePaciente.toLowerCase());

  try {
    await apiRequest("/prontuarios", {
      method: "POST",
      body: JSON.stringify({
        paciente:        nomePaciente,
        cpf:             pac ? pac.cpf : "—",
        usuarioPaciente: pac ? pac.usuario : null,
        procedimento:    document.getElementById("recordProcedure").value.trim(),
        descricao:       document.getElementById("recordDescription").value.trim()
      })
    });

    await carregarDadosApi();
    atualizarSistema();
    this.reset();
    mostrarToast("Prontuário salvo com sucesso!");
  } catch (erro) {
    mostrarToast("Erro ao salvar prontuário: " + erro.message);
  }
});

// =============================================
//  EXPORTAÇÃO E RESET DE DADOS
// =============================================

function exportarDados() {
  const dados = {
    usuarios,
    pacientes,
    consultas,
    prontuarios,
    ultimaSincronizacao,
    noRemotoOnline,
    exportadoEm: new Date().toLocaleString("pt-BR")
  };

  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "odontosync-dados.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  mostrarToast("📤 Dados exportados com sucesso.");
}

function confirmarResetDemo() {
  abrirModalConfirm({
    titulo: "Restaurar demonstração",
    corpo: "Agora os dados ficam na API e no SQLite. Para restaurar a demonstração, pare o backend e apague os arquivos .sqlite dentro de backend/src/data.",
    labelOk: "Entendi",
    classeOk: "",
    onConfirm: () => {}
  });
}

// =============================================
//  UTILITÁRIOS
// =============================================

function apenasNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function validarCPFSimples(cpf) {
  const numeros = apenasNumeros(cpf);

  if (numeros.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(numeros.charAt(9), 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;

  return resto === parseInt(numeros.charAt(10), 10);
}

function validarUsuario(usuario) {
  return /^[a-zA-Z0-9._-]{4,20}$/.test(usuario);
}

function validarSenha(senha) {
  return senha.length >= 6 && !/\s/.test(senha);
}

function dataHoraNoPassado(data, hora) {
  const alvo = new Date(data + "T" + hora);
  const agora = new Date();
  return alvo < agora;
}

function configurarDatasMinimas() {
  const hoje = new Date().toISOString().split("T")[0];
  ["appointmentDate", "remarcarDate"].forEach(id => {
    const campo = document.getElementById(id);
    if (campo) campo.min = hoje;
  });
}

function iniciais(nome) {
  if (!nome) return "?";
  const p = nome.trim().split(" ");
  return p.length === 1
    ? p[0][0].toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function formatarData(iso) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function mostrarErro(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.innerText = msg; el.classList.remove("hidden"); }
}

function limparErro(id) {
  const el = document.getElementById(id);
  if (el) { el.innerText = ""; el.classList.add("hidden"); }
}

function mostrarToast(msg) {
  let t = document.getElementById("toastMsg");
  if (!t) { t = document.createElement("div"); t.id = "toastMsg"; document.body.appendChild(t); }
  t.innerText = msg;
  t.classList.add("toast-show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("toast-show"), 3200);
}

configurarDatasMinimas();
atualizarSistema();
