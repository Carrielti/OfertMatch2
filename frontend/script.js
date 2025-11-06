/* =========================
   CONFIG BÁSICA
   ========================= */

// Botões/elementos que podem não existir em todas as páginas
const btnMenu     = document.getElementById("btnMenu");
const menuLateral = document.getElementById("menuLateral");
const overlay     = document.getElementById("overlay");

let menuAberto = false;

// ===== CONFIG API =====
// Troque o domínio se mudar o Render
const BASE_URL = "https://ofertmatch-2-0.onrender.com";

const ENDPOINTS = {
  empresas: `${BASE_URL}/api/empresas`,
  produtos: `${BASE_URL}/api/produtos`,
  ofertas:  `${BASE_URL}/api/ofertas`,
  health:   `${BASE_URL}/api/health`,
};


/* =========================
   MENU LATERAL (abrir/fechar)
   ========================= */
function abrirMenu(){
  if (!menuLateral || !overlay || !btnMenu) return;
  menuLateral.style.left = "0";
  overlay.style.display = "block";
  btnMenu.setAttribute("aria-expanded", "true");
  menuAberto = true;
}
function fecharMenu(){
  if (!menuLateral || !overlay || !btnMenu) return;
  menuLateral.style.left = "-250px";
  overlay.style.display = "none";
  btnMenu.setAttribute("aria-expanded", "false");
  menuAberto = false;
}

btnMenu?.addEventListener("click", () => {
  menuAberto ? fecharMenu() : abrirMenu();
});
overlay?.addEventListener("click", fecharMenu);
document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape" && menuAberto){ fecharMenu(); btnMenu?.focus(); }
});


/* =========================
   MODAIS (abrir/fechar)
   ========================= */

function abrirModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "flex";
  el.offsetHeight; // forçar reflow pra animar
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");

  // foca no 1º campo útil
  const firstInput = el.querySelector("input, select, textarea, button.salvar");
  if (firstInput) firstInput.focus();

  // ESC fecha
  function escHandler(ev) {
    if (ev.key === "Escape") {
      fecharModal(id);
      document.removeEventListener("keydown", escHandler);
    }
  }
  document.addEventListener("keydown", escHandler);
}

function fecharModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("show");
  setTimeout(() => {
    el.style.display = "none";
    el.setAttribute("aria-hidden", "true");
  }, 300);
}

// abrir modais via cards (home)
document.querySelectorAll(".card[data-open]").forEach(card => {
  card.addEventListener("click", ()=>{
    const destino = card.getAttribute("data-open");
    if (destino) abrirModal(destino);
  });
});

// botões X e Cancelar
document.querySelectorAll(".fechar, .cancelar").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const modalId = btn.getAttribute("data-modal");
    if (modalId) fecharModal(modalId);
  });
});

// clique fora da caixa fecha modal
window.addEventListener("click", (e)=>{
  if(e.target.classList?.contains?.("modal")){
    e.target.style.display = "none";
    e.target.setAttribute("aria-hidden", "true");
  }
});


/* =========================
   TOAST
   ========================= */
function mostrarToast(mensagem, tipo = "sucesso") {
  const toast = document.getElementById("toast");
  if (!toast) return alert(mensagem); // fallback simples
  toast.className = "toast";
  toast.classList.add(tipo);
  toast.textContent = mensagem;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}


/* =========================
   API helpers
   ========================= */
async function apiGet(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    if (!r.ok || j.ok === false) throw new Error(j.msg || "Erro ao buscar dados.");
    return j.data || [];
  } catch (e) {
    console.error(e);
    mostrarToast(e.message || "Falha de conexão.", "erro");
    return [];
  }
}

async function apiPost(url, body) {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const txt = await r.text();
    let j; try { j = JSON.parse(txt); } catch { j = { ok:false, msg: txt || "Resposta não-JSON" }; }
    if (!r.ok || j.ok === false) throw new Error(j.msg || `Erro HTTP ${r.status}`);
    return j;
  } catch (e) {
    console.error("POST error:", e);
    mostrarToast(e.message || "Falha ao enviar.", "erro");
    return null;
  }
}


/* =========================
   LISTAGEM: GET + render na tabela
   ========================= */
function showBox(idToShow) {
  document.querySelectorAll(".box-lista").forEach(box => { box.hidden = true; });
  const box = document.getElementById(idToShow);
  if (box) box.hidden = false;
}

function renderEmpresas(items) {
  const tbody = document.getElementById("tbodyEmpresas");
  if (!tbody) return;
  tbody.innerHTML = "";
  items.forEach(emp => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${emp.razao_social ?? ""}</td>
      <td>${emp.cnpj ?? ""}</td>
      <td>${emp.endereco ?? ""}</td>
      <td>${emp.email ?? ""}</td>
      <td>${emp.responsavel ?? ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderProdutos(items) {
  const tbody = document.getElementById("tbodyProdutos");
  if (!tbody) return;
  tbody.innerHTML = "";
  items.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nome ?? ""}</td>
      <td>${p.codigo ?? ""}</td>
      <td>${p.estoque ?? ""}</td>
      <td>${p.categoria ?? ""}</td>
      <td>${p.marca ?? ""}</td>
      <td>${p.valor ?? ""}</td>
      <td>${p.validade ?? ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderOfertas(items) {
  const tbody = document.getElementById("tbodyOfertas");
  if (!tbody) return;
  tbody.innerHTML = "";
  items.forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${o.produto ?? ""}</td>
      <td>${o.marca ?? ""}</td>
      <td>${o.codigo ?? ""}</td>
      <td>${o.estoque ?? ""}</td>
      <td>${o.categoria ?? ""}</td>
      <td>${o.valor ?? ""}</td>
      <td>${o.validade ?? ""}</td>
      <td>${o.data_inicio ?? ""}</td>
      <td>${o.data_fim ?? ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function carregarEmpresas() {
  showBox("boxEmpresas");
  const data = await apiGet(ENDPOINTS.empresas);
  renderEmpresas(data);
}
async function carregarProdutos() {
  showBox("boxProdutos");
  const data = await apiGet(ENDPOINTS.produtos);
  renderProdutos(data);
}
async function carregarOfertas() {
  showBox("boxOfertas");
  const data = await apiGet(ENDPOINTS.ofertas);
  renderOfertas(data);
}

document.getElementById("btnVerEmpresas")?.addEventListener("click", carregarEmpresas);
document.getElementById("btnVerProdutos")?.addEventListener("click", carregarProdutos);
document.getElementById("btnVerOfertas")?.addEventListener("click", carregarOfertas);


/* =========================
   SUBMIT dos formulários (POST real)
   ========================= */

/** Mapeamento por placeholder (legado). Mantido para compatibilidade. */
const MAP_KEYS = {
  modalEmpresa: {
    "Razão social": "razao_social",
    "CNPJ": "cnpj",
    "Endereço": "endereco",
    "E-mail empresarial": "email",
    "Responsável": "responsavel",
  },
  modalProduto: {
    "Produto": "nome",
    "Código de produto": "codigo",
    "Estoque": "estoque",
    "Categoria": "categoria",
    "Marca": "marca",
    "Valor": "valor",
    "Validade": "validade",
  },
  modalOferta: {
    "Produto": "produto",
    "Marca": "marca",
    "Código do produto": "codigo",
    "Estoque": "estoque",
    "Categoria": "categoria",
    "Valor": "valor",
    "Validade": "validade",
    "Data início": "data_inicio",
    "Data fim": "data_fim",
  }
};

// Converte números onde fizer sentido
function coerceValue(key, value) {
  const numeric = ["estoque", "valor"];
  if (numeric.includes(key)) {
    const n = Number((value ?? "").toString().replace(",", "."));
    return isNaN(n) ? 0 : n;
  }
  return (value ?? "").trim();
}

document.querySelectorAll(".modal form").forEach(form => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const modal = form.closest(".modal");
    if (!modal) return;
    const modalId = modal.id;
    const map = MAP_KEYS[modalId] || {};

    const inputs = form.querySelectorAll("input, select, textarea");
    let vazio = false;
    const payload = {};

    inputs.forEach(inp => {
      const attrKey = inp.getAttribute("data-field");          // preferível
      const ph      = inp.getAttribute("placeholder") || "";
      const key     = attrKey || map?.[ph];                    // fallback p/ placeholder legado
      const val     = (inp.value ?? "").trim();

      if (inp.hasAttribute("required") && val === "") {
        inp.style.border = "2px solid #c0392b";
        vazio = true;
      } else if (val !== "") {
        inp.style.border = "2px solid #59e1a1";
      } else {
        inp.style.border = ""; // limpa
      }

      if (key) payload[key] = coerceValue(key, val);
    });

    if (vazio) {
      mostrarToast("Por favor, preencha todos os campos obrigatórios.", "erro");
      return;
    }

    // Decide endpoint
    let endpoint = "";
    if (modalId === "modalEmpresa") endpoint = ENDPOINTS.empresas;
    else if (modalId === "modalProduto") endpoint = ENDPOINTS.produtos;
    else if (modalId === "modalOferta")  endpoint = ENDPOINTS.ofertas;
    if (!endpoint) {
      mostrarToast("Formulário sem endpoint configurado.", "erro");
      return;
    }

    const ok = await apiPost(endpoint, payload);
    if (ok && ok.ok) {
      mostrarToast("Cadastro salvo com sucesso!", "sucesso");
      form.reset();
      inputs.forEach(i => i.style.border = "none");
      fecharModal(modalId);
      if (modalId === "modalEmpresa") carregarEmpresas();
      if (modalId === "modalProduto") carregarProdutos();
      if (modalId === "modalOferta")  carregarOfertas();
    }
  });
});


/* =========================
   MENU: MARCAR ITEM ATIVO
   ========================= */
const menuLinks = document.querySelectorAll(".menu-lateral a");
menuLinks.forEach(link => {
  link.addEventListener("click", function() {
    menuLinks.forEach(l => l.classList.remove("active"));
    this.classList.add("active");
  });
});
// marca ativo pelo URL ao carregar
document.querySelectorAll(".menu-lateral a").forEach(link => {
  try {
    if (link.href === window.location.href) link.classList.add("active");
  } catch {}
});


/* =========================
   HEALTH CHECK (uma vez só)
   ========================= */
async function checkApi() {
  const el = document.getElementById("api-status");
  if (!el) return;
  try {
    const r = await fetch(ENDPOINTS.health, { cache: "no-store" });
    const data = await r.json();
    el.textContent = data?.ok ? "API online ✅" : "API respondeu, mas sem OK";
  } catch {
    el.textContent = "API offline (Render hibernado?) ⏳";
  }
}
document.addEventListener("DOMContentLoaded", checkApi);


/* =========================
   THEME: toggle + persistência
   ========================= */
(function temaEscuro() {
  const BTN_ID = "btnTheme";
  const STORAGE_KEY = "om-theme"; // 'light' | 'dark'

  function setBtnIcon(isDark) {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.textContent = isDark ? "☀️" : "🌙";
    btn.setAttribute("aria-label", isDark ? "Ativar tema claro" : "Ativar tema escuro");
    btn.setAttribute("title", isDark ? "Tema claro" : "Tema escuro");
    btn.setAttribute("aria-pressed", String(isDark));
  }

  function applyTheme(mode) {
    const isDark = mode === "dark";
    document.body.classList.toggle("theme-dark", isDark);
    setBtnIcon(isDark);
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  const preferDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = saved || (preferDark ? "dark" : "light");
  applyTheme(initial);

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.id === BTN_ID) {
      const isDark = document.body.classList.toggle("theme-dark");
      localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
      setBtnIcon(isDark);
    }
  });
})();


/* =========================
   AUTO-CARREGAMENTO por página
   (usa <body data-page="..."> nas páginas de lista)
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body?.dataset?.page || "";
  if (page === "lista-ofertas")  carregarOfertas();
  if (page === "lista-produtos") carregarProdutos();
  // se quiser: if (page === "home-empresa") carregarEmpresas() etc.
});

/* =========================
   PAINEL DIREITO (Configurações ⚙)
   ========================= */
const btnConfig  = document.getElementById("btnConfig");

// Detecta qual painel existe (páginas antigas ou novas)
const painelDireito = document.getElementById("menuOpcoes") || document.getElementById("menuConfig");
const overlayPainel = document.getElementById("overlay");

let painelAberto = false;

function abrirPainel() {
  if (!painelDireito) return;
  painelDireito.classList.add("open", "show");
  painelDireito.setAttribute("aria-hidden", "false");
  if (overlayPainel) overlayPainel.style.display = "block";
  painelAberto = true;
}

function fecharPainel() {
  if (!painelDireito) return;
  painelDireito.classList.remove("open", "show");
  painelDireito.setAttribute("aria-hidden", "true");
  if (overlayPainel) overlayPainel.style.display = "none";
  painelAberto = false;
}

// Botão ⚙ abre/fecha painel
btnConfig?.addEventListener("click", (e) => {
  e.stopPropagation();
  painelAberto ? fecharPainel() : abrirPainel();
});

// Fecha ao clicar fora
document.addEventListener("click", (e) => {
  if (
    painelAberto &&
    painelDireito &&
    !painelDireito.contains(e.target) &&
    e.target !== btnConfig
  ) {
    fecharPainel();
  }
});

// Fecha com ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && painelAberto) fecharPainel();
});


/* =========================
   TEMA ESCURO (Persistente em TODAS as páginas)
   ========================= */
const THEME_KEY = "om-theme";

function aplicarTemaInicial() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const startDark = saved ? saved === "dark" : prefersDark;
  document.body.classList.toggle("theme-dark", startDark);
}

function toggleTheme() {
  const agoraEscuro = !document.body.classList.contains("theme-dark");
  document.body.classList.toggle("theme-dark", agoraEscuro);
  localStorage.setItem(THEME_KEY, agoraEscuro ? "dark" : "light");
}

// Aplica o tema salvo ao carregar
aplicarTemaInicial();

// Vincula botão de alternar tema (compatível com ambos os tipos)
document.getElementById("opAlterarTema")?.addEventListener("click", toggleTheme);
document.getElementById("toggleTheme")?.addEventListener("click", toggleTheme);


/* =========================
   AÇÕES DO MENU DIREITO
   ========================= */
document.getElementById("opPerfil")?.addEventListener("click", () => {
  mostrarToast("Abrindo perfil…");
});

document.getElementById("opSair")?.addEventListener("click", () => {
  mostrarToast("Saindo…");
  // Exemplo: window.location.href = "login.html";
});
