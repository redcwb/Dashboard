/* ═══════════════════════════════════════════════════════════════
   MODULE: filters.js
   Filtros, navegação de meses, views, tabs, busca
   Depende de: state.js, data.js
   
   Nota: funções de render (render, renderSecPanel, renderTabela)
   são injetadas via setRenderFns() pelo app.js para evitar circular import
   ═══════════════════════════════════════════════════════════════ */

import S from './state.js';
import { getUF, getTR, getUFExceto } from './data.js';

/* ── Referências de render (injetadas pelo app.js) ─────────── */
let _render = () => {};
let _renderSecPanel = () => {};
let _renderTabela = () => {};
let _showAuthOrLogout = () => {};
let _setSyncStatus = () => {};
let _setUserUI = () => {};
let _cmdVerificar = async () => {};
let _cmdEnviar = async () => {};
let _cmdBaixar = async () => {};
let _cmdRetentar = async () => {};

export function setRenderFns(fns) {
  if (fns.render) _render = fns.render;
  if (fns.renderSecPanel) _renderSecPanel = fns.renderSecPanel;
  if (fns.renderTabela) _renderTabela = fns.renderTabela;
  if (fns.showAuthOrLogout) _showAuthOrLogout = fns.showAuthOrLogout;
  if (fns.setSyncStatus) _setSyncStatus = fns.setSyncStatus;
  if (fns.setUserUI) _setUserUI = fns.setUserUI;
  if (fns.cmdVerificar) _cmdVerificar = fns.cmdVerificar;
  if (fns.cmdEnviar) _cmdEnviar = fns.cmdEnviar;
  if (fns.cmdBaixar) _cmdBaixar = fns.cmdBaixar;
  if (fns.cmdRetentar) _cmdRetentar = fns.cmdRetentar;
}

/* ── Filtro direto por campo ───────────────────────────────── */
export function filterTR(tr) { S.fTR = tr; updSelects(); updCl(); S.tPage = 0; _render(); }
export function filterUF(v) { S.fUF = v; updSelects(); updCl(); S.tPage = 0; _render(); }
export function filterCI(v) { S.fCI = v; updSelects(); updCl(); S.tPage = 0; _render(); }
export function filterUV(v) { S.fUV = v; updSelects(); updCl(); S.tPage = 0; _render(); }
export function filterUL(v) { S.fUL = v; updSelects(); updCl(); S.tPage = 0; _render(); }
export function filterRC(v) { S.fRC = v; updSelects(); updCl(); S.tPage = 0; _render(); }
export function setTrFiltCrit(v) { S.trFiltCrit = v; _renderSecPanel(); }

/* ── Filtro genérico (chamado pelos onchange do HTML) ──────── */
export function onF(c, v) {
  if (c === "emp") S.fEmp = v; else if (c === "si") S.fSi = v; else if (c === "ul") S.fUL = v; else if (c === "uv") S.fUV = v;
  else if (c === "uf") S.fUF = v; else if (c === "tr") S.fTR = v; else if (c === "rc") S.fRC = v; else if (c === "ci") S.fCI = v;
  updSelects();
  updCl(); S.tPage = 0; S.agAbSel = null; S.agFeSel = null; _render();
}

/* ── Limpar 1 filtro ───────────────────────────────────────── */
export function clrF(c) {
  if (c === "emp") S.fEmp = "Todas";
  else if (c === "si") S.fSi = "Todos";
  else if (c === "ul") S.fUL = "Todos";
  else if (c === "uv") S.fUV = "Todos";
  else if (c === "uf") S.fUF = "Todos";
  else if (c === "tr") S.fTR = "Todos";
  else if (c === "rc") S.fRC = "Todos";
  else if (c === "ci") S.fCI = "Todos";
  updSelects();
  updCl(); S.tPage = 0; _render();
}

/* ── Limpar todos os filtros ───────────────────────────────── */
export function limpar() {
  S.fEmp = "Todas"; S.fSi = "Todos"; S.fUL = "Todos"; S.fUV = "Todos";
  S.fUF = "Todos"; S.fTR = "Todos"; S.fRC = "Todos"; S.fCI = "Todos";
  S.busca = ""; S.destHigh = "";
  const bi = document.getElementById("f-busca"); if (bi) bi.value = "";
  updSelects();
  updCl(); S.tPage = 0; S.agAbSel = null; S.agFeSel = null; _render();
}

/* ── updSelects: recalcula opções de cada select ───────────── */
export function updSelects() {
  const repl = (id, prim, vals, atual, setter, total, sortFn) => {
    const el = document.getElementById(id);
    if (!el) return false;
    const sorted = sortFn ? [...new Set(vals)].sort(sortFn) : [...new Set(vals)].sort();
    const uq = [prim, ...sorted];
    const keep = uq.includes(atual) ? atual : prim;
    const prev = [...el.options].map(o => o.value).join("|");
    const next = uq.join("|");
    if (prev !== next) {
      el.innerHTML = "";
      uq.forEach(o => { const op = document.createElement("option"); op.value = o; op.textContent = o; if (o === keep) op.selected = true; el.appendChild(op); });
    } else {
      el.value = keep;
    }
    const nOpts = uq.length - 1;
    el.classList.toggle("restrito", total != null && nOpts < total && nOpts > 0);
    if (keep !== atual) { setter(keep); return true; }
    return false;
  };
  let changed = false;
  changed |= repl("f-emp", "Todas", getUFExceto("emp").map(r => r.emp), S.fEmp, v => { S.fEmp = v; }, S.EMPS_D.length - 1);
  changed |= repl("f-si", "Todos", getUFExceto("si").map(r => r.si), S.fSi, v => { S.fSi = v; }, S.SIS_D.length - 1);
  changed |= repl("f-ul", "Todos", getUFExceto("ul").map(r => r.ul), S.fUL, v => { S.fUL = v; }, S.UL_D.length - 1, (a, b) => { const na = parseInt(a) || 9999, nb = parseInt(b) || 9999; return na - nb; });
  changed |= repl("f-uv", "Todos", getUFExceto("uv").map(r => r.uv), S.fUV, v => { S.fUV = v; }, S.UNI_VDA.length - 1);
  changed |= repl("f-uf", "Todos", getUFExceto("uf").map(r => r.uf), S.fUF, v => { S.fUF = v; }, S.UFS.length - 1);
  const trVals = []; getUFExceto("tr").forEach(r => r.trs && r.trs.forEach(t => trVals.push(t)));
  changed |= repl("f-tr", "Todos", trVals, S.fTR, v => { S.fTR = v; }, S.TRS.length - 1);
  changed |= repl("f-rc", "Todos", getUFExceto("rc").map(r => r.rc), S.fRC, v => { S.fRC = v; }, S.RCS_D.length - 1);
  changed |= repl("f-ci", "Todos", getUFExceto("ci").map(r => r.cidade), S.fCI, v => { S.fCI = v; }, S.CIDADES_D.length - 1);
  return changed;
}

/* ── updCl: mostrar/ocultar botão "Limpar" ─────────────────── */
export function updCl() {
  const a = S.fEmp !== "Todas" || S.fSi !== "Todos" || S.fUL !== "Todos" || S.fUV !== "Todos" || S.fUF !== "Todos" || S.fTR !== "Todos" || S.fRC !== "Todos" || S.fCI !== "Todos";
  const btn = document.getElementById("btn-cl");
  if (btn) btn.style.display = a ? "block" : "none";
}

/* ── initSelects (chamado no boot) ─────────────────────────── */
export function initSelects() { updSelects(); }

/* ── Navegação de meses ────────────────────────────────────── */
export function setMes(m) {
  S.mes = m;
  ["jan", "fev", "mar"].forEach(t => {
    const b = document.getElementById("tab-" + t);
    if (b) { b.classList.toggle("on", t === m.split("-")[0]); b.setAttribute("aria-selected", t === m.split("-")[0]); }
  });
  S.tPage = 0; S.agAbSel = null; S.agFeSel = null; _render();
}

/* ── Visibilidade: Todos/Abertos/Fechados ──────────────────── */
export function setVis(v) {
  S.fVis = v;
  S.tSort = v === "A" ? "abAt" : "fp"; S.tDir = 1; S.tPage = 0;
  ["T", "A", "F"].forEach(t => {
    const b = document.getElementById("vb-" + t);
    if (b) { b.classList.toggle("on", t === v); b.setAttribute("aria-pressed", t === v ? "true" : "false"); }
  });
  S.agAbSel = null; S.agFeSel = null; _render();
}

/* ── Tabs de seção ─────────────────────────────────────────── */
export function setTab(t) {
  S.secTab = t;
  ["vg", "cm", "tr", "in", "lt", "cl", "ti", "ci", "mp", "tb"].forEach(s => {
    const st = document.getElementById("st-" + s);
    const sp = document.getElementById("sp-" + s);
    if (st) { st.classList.toggle("on", s === t); st.setAttribute("aria-selected", s === t); }
    if (sp) sp.classList.toggle("on", s === t);
  });
}

/* ── View da tabela (UF, TR, UV, etc.) ─────────────────────── */
export function setView(v) {
  S.view = v;
  const el = document.getElementById("view-sel");
  if (el) el.value = v;
  S.tSort = "fp"; S.tDir = 1; S.tPage = 0; S.destHigh = "";
  _renderTabela(getUF(), getTR());
}

/* ── Ordenação da tabela ───────────────────────────────────── */
export function sortBy(k) {
  if (S.tSort === k) S.tDir *= -1; else { S.tSort = k; S.tDir = 1; }
  S.tPage = 0;
  _renderTabela(getUF(), getTR());
}

/* ── Paginação ─────────────────────────────────────────────── */
export function goP(p) {
  S.tPage = p;
  _renderTabela(getUF(), getTR());
  document.getElementById("sp-tb")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ── Busca / comandos ──────────────────────────────────────── */
export function onBusca(v) {
  const cmd = v.trim().toLowerCase();
  const clr = () => { const el = document.getElementById('f-busca'); if (el) el.value = ''; S.busca = ''; };

  if (cmd === '/conectar' || cmd === '/sync') { clr(); _showAuthOrLogout(); return; }
  if (cmd === '/sair' || cmd === '/logout') {
    clr();
    if (S.SUPA_USER && S.SUPA_AVAILABLE) { S.supaClient.auth.signOut(); S.SUPA_USER = null; _setUserUI(null); _setSyncStatus('local', 'Offline'); alert('Desconectado.'); }
    else alert('Não está conectado.');
    return;
  }
  if (cmd === '/estado' || cmd === '/status') {
    clr();
    const syncLbl = document.getElementById('sync-label')?.textContent || '—';
    const lastSync = window._lastSyncAt ? new Date(window._lastSyncAt).toLocaleString('pt-BR') : 'nunca';
    alert(S.SUPA_USER
      ? '☁️ Conectado como: ' + S.SUPA_USER.email + '\nStatus: ' + syncLbl + '\nÚltima sincronização: ' + lastSync
      : '📱 Modo offline\nDigite /conectar para acessar o servidor');
    return;
  }
  if (cmd === '/verificar' || cmd === '/check') { clr(); _cmdVerificar(); return; }
  if (cmd === '/enviar' || cmd === '/push') { clr(); _cmdEnviar(); return; }
  if (cmd === '/baixar' || cmd === '/pull') { clr(); _cmdBaixar(); return; }
  if (cmd === '/retentar' || cmd === '/retry') { clr(); _cmdRetentar(); return; }
  if (cmd === '/ajuda' || cmd === '/help') {
    clr();
    alert('Comandos disponíveis:\n\n/conectar — Login no servidor\n/sair — Desconectar\n/estado — Status da conexão\n/enviar — Sincronizar dados para o servidor\n/baixar — Baixar dados do servidor\n/verificar — Checar integridade local vs servidor\n/retentar — Tentar novamente chunks que falharam\n/ajuda — Esta lista');
    return;
  }

  S.busca = v; S.tPage = 0; _renderTabela(getUF(), getTR());
}

/* ── filtTop5 (chamado do Insights) ────────────────────────── */
export function filtTop5(el) {
  const ci = el.getAttribute("data-ci");
  const uf = el.getAttribute("data-uf");
  if (ci) onF("ci", ci);
  if (uf) onF("uf", uf);
}

/* ── Highlight destino ─────────────────────────────────────── */
export function onDestHigh(v) { S.destHigh = v; _renderTabela(getUF(), getTR()); }

/* ── Evolução view ─────────────────────────────────────────── */
export function setEvView(v) { S.evView = v; _renderSecPanel(); }
export function toggleEvSeries(k) {
  const i = S.evSeries.indexOf(k);
  if (i >= 0) { if (S.evSeries.length > 1) S.evSeries.splice(i, 1); }
  else { S.evSeries.push(k); }
  _renderSecPanel();
}
