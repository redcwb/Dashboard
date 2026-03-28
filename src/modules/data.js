/* ═══════════════════════════════════════════════════════════════
   MODULE: data.js
   Acesso aos dados filtrados — getUF, getTR, getDB, getDBMes,
   getAGMes, getSLAAtual, getUFExceto, parseDt, normTR,
   isUtil, horasUteis, recalcDims, setUploadStatus, renderValidacao
   Depende de: state.js, config.js
   ═══════════════════════════════════════════════════════════════ */

import S from './state.js';
import { TR_ALIASES, FERIADOS_SET, VAL_REF } from './config.js';
import { fm, pct } from './helpers.js';

/* ── Normalização de transportadora ────────────────────────── */
export function normTR(s) {
  if (!s || s === '-') return '';
  const u = s.trim().toUpperCase().replace(/\s+/g, ' ');
  if (TR_ALIASES[u]) return TR_ALIASES[u];
  return u;
}

/* ── Funções de data ───────────────────────────────────────── */
export function isUtil(d) { const w = d.getDay(); return w >= 1 && w <= 5 && !FERIADOS_SET.has(d.toISOString().slice(0, 10)); }

export function horasUteis(ini, fim) {
  if (!ini || !fim || fim <= ini) return 0;
  let t = 0, c = new Date(ini);
  while (c < fim) {
    if (isUtil(c)) {
      const a = new Date(c); a.setHours(8, 0, 0, 0);
      const b = new Date(c); b.setHours(18, 0, 0, 0);
      const ei = c > a ? c : a, ef = fim < b ? fim : b;
      if (ef > ei) t += (ef - ei) / 3600000;
    }
    c = new Date(c); c.setDate(c.getDate() + 1); c.setHours(8, 0, 0, 0);
  }
  return Math.round(t * 10) / 10;
}

export function parseDt(v) {
  if (!v || v === '-' || v === null) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === 'number' && v > 40000) { const d = new Date(Math.round((v - 25569) * 86400 * 1000)); return new Date(d.getTime() + d.getTimezoneOffset() * 60000); }
  const s = String(v).trim();
  if (/^\d{4,6}(\.\d+)?$/.test(s)) { const n = parseFloat(s); if (n > 40000) { const d = new Date(Math.round((n - 25569) * 86400 * 1000)); return new Date(d.getTime() + d.getTimezoneOffset() * 60000); } }
  let m;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})(?::(\d{2}))?/); if (m) return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/); if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}

/* ── Upload status ─────────────────────────────────────────── */
export function setUploadStatus(msg, cor) {
  const el = document.getElementById('upload-status');
  if (el) { el.textContent = msg; el.style.color = cor || '#93c5fd'; }
}

/* ── Recalcular dimensões derivadas ────────────────────────── */
export function recalcDims() {
  if (S.UF_RAW.length > 0) {
    S.EMPS_D.length = 0; ['Todas', ...[...new Set(S.UF_RAW.map(r => r.emp))].sort()].forEach(v => S.EMPS_D.push(v));
    S.SIS_D.length = 0; ['Todos', ...[...new Set(S.UF_RAW.map(r => r.si))].sort()].forEach(v => S.SIS_D.push(v));
    S.UL_D.length = 0; ['Todos', ...[...new Set(S.UF_RAW.map(r => r.ul))].filter(v => v && v !== "-").sort((a, b) => { const na = parseInt(a) || 9999, nb = parseInt(b) || 9999; return na - nb; })].forEach(v => S.UL_D.push(v));
    S.UNI_VDA.length = 0; ['Todos', ...[...new Set(S.UF_RAW.map(r => r.uv))].sort()].forEach(v => S.UNI_VDA.push(v));
    S.UFS.length = 0; ['Todos', ...[...new Set(S.UF_RAW.map(r => r.uf))].sort()].forEach(v => S.UFS.push(v));
    S.TRS.length = 0; ['Todos', ...[...new Set(S.TR_RAW.map(r => r.tr))].sort()].forEach(v => S.TRS.push(v));
    if (typeof S.RCS_D !== 'undefined') { S.RCS_D.length = 0; ['Todos', ...[...new Set(S.UF_RAW.map(r => r.rc).filter(Boolean))].sort()].forEach(v => S.RCS_D.push(v)); }
    if (typeof S.CIDADES_D !== 'undefined') { S.CIDADES_D.length = 0; ['Todos', ...[...new Set(S.UF_RAW.map(r => r.cidade).filter(Boolean))].sort()].forEach(v => S.CIDADES_D.push(v)); }
  }
}

/* ── getSLAAtual ───────────────────────────────────────────── */
export function getSLAAtual() { return S.SLA_CACHE[S.mes] || { logNP: 0, logAt: 0, colNP: 0, colAt: 0 }; }

/* ── getUF — dados filtrados por UF ────────────────────────── */
export function getUF() {
  if (S.fTR !== "Todos") {
    const trRows = S.TR_RAW.filter(r => r._mes === S.mes && r.tr === S.fTR);
    let filtered = trRows;
    if (S.fEmp !== "Todas") filtered = filtered.filter(r => r.emp === S.fEmp);
    if (S.fSi !== "Todos") filtered = filtered.filter(r => r.si === S.fSi);
    if (S.fUL !== "Todos") filtered = filtered.filter(r => r.ul === S.fUL);
    if (filtered.length > 0) {
      const pedFilt = S.PEDIDOS_RAW.filter(function (p) {
        if (p.mes !== S.mes) return false;
        if (p.tr !== S.fTR) return false;
        if (S.fUF !== "Todos" && p.uf !== S.fUF) return false;
        if (S.fEmp !== "Todas" && p.emp !== S.fEmp) return false;
        if (S.fSi !== "Todos" && p.si !== S.fSi) return false;
        if (S.fUL !== "Todos" && p.ul !== S.fUL) return false;
        if (S.fUV !== "Todos" && p.uv !== S.fUV) return false;
        if (S.fRC !== "Todos" && p.rc !== S.fRC) return false;
        if (S.fCI !== "Todos" && p.cidade !== S.fCI) return false;
        return true;
      });
      const m = new Map();
      pedFilt.forEach(function (p) {
        const k = p.mes + '|' + p.uf + '|' + p.ul + '|' + p.uv + '|' + p.emp + '|' + p.rc + '|' + p.cidade + '|' + p.si;
        if (!m.has(k)) m.set(k, {
          _mes: p.mes, uf: p.uf, ul: p.ul, uv: p.uv, emp: p.emp, rc: p.rc, cidade: p.cidade, si: p.si, regiao: p.regiao,
          ent: 0, np: 0, fp: 0, spEnt: 0, ab: 0, abNP: 0, abAt: 0, spAb: 0, trs: new Set(),
          logNP: 0, logAt: 0, colNP: 0, colAt: 0,
          ag_a1: 0, ag_a2: 0, ag_a6: 0, ag_a16: 0, ag_a31: 0,
          ag_ab_a1: 0, ag_ab_a2: 0, ag_ab_a6: 0, ag_ab_a16: 0, ag_ab_a31: 0
        });
        var a = m.get(k);
        var ab = p.at === 'Em aberto';
        var atr = p.atr !== null && p.atr !== undefined ? Number(p.atr) : null;
        if (!ab) {
          a.ent++;
          var eOk = atr !== null ? atr <= 0 : null;
          if (eOk === true) a.np++;
          else if (eOk === false) { a.fp++; if (atr !== null) { if (atr === 1) a.ag_a1++; else if (atr <= 5) a.ag_a2++; else if (atr <= 15) a.ag_a6++; else if (atr <= 30) a.ag_a16++; else a.ag_a31++; } }
          else a.spEnt++;
        } else {
          a.ab++;
          if (atr !== null && atr >= 1) { a.abAt++; if (atr === 1) a.ag_ab_a1++; else if (atr <= 5) a.ag_ab_a2++; else if (atr <= 15) a.ag_ab_a6++; else if (atr <= 30) a.ag_ab_a16++; else a.ag_ab_a31++; }
          else if (atr === null) a.spAb++;
          else a.abNP++;
        }
        if (p.tr) a.trs.add(p.tr);
      });
      return [...m.values()].map(function (r) { r.np = r.np || Math.max(0, r.ent - r.fp - r.spEnt); r.trs = [...r.trs]; return r; });
    }
  }

  let rows = S.UF_RAW.filter(r => !r._mes || r._mes === S.mes);
  if (S.fUF !== "Todos") rows = rows.filter(r => r.uf === S.fUF);
  if (S.fUV !== "Todos") rows = rows.filter(r => r.uv === S.fUV);
  if (S.fEmp !== "Todas") rows = rows.filter(r => r.emp === S.fEmp);
  if (S.fSi !== "Todos") rows = rows.filter(r => r.si === S.fSi);
  if (S.fUL !== "Todos") rows = rows.filter(r => r.ul === S.fUL);
  if (S.fRC !== "Todos") rows = rows.filter(r => r.rc === S.fRC);
  if (S.fCI !== "Todos") rows = rows.filter(r => r.cidade === S.fCI);
  return rows;
}

/* ── getTR — dados filtrados por Transportadora ────────────── */
export function getTR() {
  const ufRows = getUF();
  const hasMes = S.TR_RAW.length > 0 && S.TR_RAW.some(r => r._mes);
  if (hasMes) {
    const validKeys = new Set();
    ufRows.forEach(r => { validKeys.add((r.ul || '') + '|' + (r.emp || '') + '|' + (r.si || '')); });
    let rows = S.TR_RAW.filter(r => r._mes === S.mes);
    rows = rows.filter(r => { const k = (r.ul || '') + '|' + (r.emp || '') + '|' + (r.si || ''); return validKeys.has(k); });
    if (S.fTR !== "Todos") rows = rows.filter(r => r.tr === S.fTR);
    return rows;
  }
  const valid = new Set();
  ufRows.forEach(r => r.trs && r.trs.forEach(t => valid.add(t)));
  let rows = S.TR_RAW.filter(r => valid.has(r.tr));
  if (S.fTR !== "Todos") rows = rows.filter(r => r.tr === S.fTR);
  return rows;
}

/* ── getUFExceto — filtra exceto 1 campo (para selects) ────── */
export function getUFExceto(ex) {
  let rows = S.UF_RAW.filter(r => !r._mes || r._mes === S.mes);
  if (ex !== "emp" && S.fEmp !== "Todas") rows = rows.filter(r => r.emp === S.fEmp);
  if (ex !== "si" && S.fSi !== "Todos") rows = rows.filter(r => r.si === S.fSi);
  if (ex !== "ul" && S.fUL !== "Todos") rows = rows.filter(r => r.ul === S.fUL);
  if (ex !== "uv" && S.fUV !== "Todos") rows = rows.filter(r => r.uv === S.fUV);
  if (ex !== "uf" && S.fUF !== "Todos") rows = rows.filter(r => r.uf === S.fUF);
  if (ex !== "tr" && S.fTR !== "Todos") rows = rows.filter(r => r.trs && r.trs.includes(S.fTR));
  if (ex !== "rc" && S.fRC !== "Todos") rows = rows.filter(r => r.rc === S.fRC);
  if (ex !== "ci" && S.fCI !== "Todos") rows = rows.filter(r => r.cidade === S.fCI);
  return rows;
}

/* ── getDB — KPIs do mês ativo com filtros ─────────────────── */
export function getDB() {
  const _e = { ent: 0, np: 0, fp: 0, spEnt: 0, ab: 0, abNP: 0, abAt: 0, spAb: 0, dMedEnt: 0, dMedAb: 0 };
  const raw = S.DB_RAW[S.mes] || _e;
  const semFiltro = S.fUF === "Todos" && S.fUV === "Todos" && S.fEmp === "Todas" && S.fSi === "Todos" && S.fUL === "Todos" && S.fTR === "Todos" && S.fRC === "Todos" && S.fCI === "Todos";
  if (semFiltro) return raw || _e;

  if (S.fTR !== "Todos") {
    const trRows = getTR();
    if (trRows.length > 0) {
      const ent = trRows.reduce((s, r) => s + (r.ent || 0), 0);
      const fp = trRows.reduce((s, r) => s + (r.fp || 0), 0);
      const np = trRows.reduce((s, r) => s + (r.np !== undefined ? r.np : Math.max(0, (r.ent || 0) - (r.fp || 0) - (r.spEnt || 0))), 0);
      const spEnt = trRows.reduce((s, r) => s + (r.spEnt || 0), 0);
      const ab = trRows.reduce((s, r) => s + (r.ab || 0), 0);
      const abAt = trRows.reduce((s, r) => s + (r.abAt || 0), 0);
      const abNP = trRows.reduce((s, r) => s + (r.abNP || 0), 0);
      const spAb = trRows.reduce((s, r) => s + (r.spAb || 0), 0);
      return { ...raw, ent, np, fp, spEnt, ab, abAt, abNP, spAb, dMedEnt: raw.dMedEnt || 0, dMedAb: raw.dMedAb || 0 };
    }
  }

  const ufRows = getUF();
  const temPlanilha = ufRows.some(r => r._mes);
  if (temPlanilha) {
    const ent = ufRows.reduce((s, r) => s + (r.ent || 0), 0);
    const fp = ufRows.reduce((s, r) => s + (r.fp || 0), 0);
    const np = ufRows.reduce((s, r) => s + (r.np !== undefined ? r.np : Math.max(0, (r.ent || 0) - (r.fp || 0) - (r.spEnt || 0))), 0);
    const spEnt = ufRows.reduce((s, r) => s + (r.spEnt || 0), 0);
    const ab = ufRows.reduce((s, r) => s + (r.ab || 0), 0);
    const abAt = ufRows.reduce((s, r) => s + (r.abAt || 0), 0);
    const abNP = ufRows.reduce((s, r) => s + (r.abNP || 0), 0);
    const spAb = ufRows.reduce((s, r) => s + (r.spAb || 0), 0);
    return { ...raw, ent, np, fp, spEnt, ab, abAt, abNP, spAb, dMedEnt: raw.dMedEnt || 0, dMedAb: raw.dMedAb || 0 };
  }
  const ufHard = S.UF_RAW.filter(r => !r._mes);
  const totEnt = ufHard.reduce((s, r) => s + r.ent, 0) || 1;
  const totAb = ufHard.reduce((s, r) => s + r.ab, 0) || 1;
  const rEnt = getUF().filter(r => !r._mes).reduce((s, r) => s + r.ent, 0) / totEnt;
  const rAb = getUF().filter(r => !r._mes).reduce((s, r) => s + r.ab, 0) / totAb;
  return {
    ...raw,
    ent: Math.round(raw.ent * rEnt), np: Math.round(raw.np * rEnt), fp: Math.round(raw.fp * rEnt), spEnt: Math.round(raw.spEnt * rEnt),
    ab: Math.round(raw.ab * rAb), abNP: Math.round(raw.abNP * rAb), abAt: Math.round(raw.abAt * rAb), spAb: Math.round(raw.spAb * rAb)
  };
}

/* ── getDBMes — KPIs para qualquer mês (comparativo) ──────── */
export function getDBMes(mk) {
  const raw = S.DB_RAW[mk];
  let ufMk = S.UF_RAW.filter(r => r._mes === mk);
  if (S.fUF !== "Todos") ufMk = ufMk.filter(r => r.uf === S.fUF);
  if (S.fUV !== "Todos") ufMk = ufMk.filter(r => r.uv === S.fUV);
  if (S.fEmp !== "Todas") ufMk = ufMk.filter(r => r.emp === S.fEmp);
  if (S.fSi !== "Todos") ufMk = ufMk.filter(r => r.si === S.fSi);
  if (S.fUL !== "Todos") ufMk = ufMk.filter(r => r.ul === S.fUL);
  if (S.fTR !== "Todos") ufMk = ufMk.filter(r => r.trs && r.trs.includes(S.fTR));
  if (S.fRC !== "Todos") ufMk = ufMk.filter(r => r.rc === S.fRC);
  if (S.fCI !== "Todos") ufMk = ufMk.filter(r => r.cidade === S.fCI);

  const semFiltro = S.fUF === "Todos" && S.fUV === "Todos" && S.fEmp === "Todas" && S.fSi === "Todos" && S.fUL === "Todos" && S.fTR === "Todos" && S.fRC === "Todos" && S.fCI === "Todos";
  if (semFiltro) return raw;

  if (ufMk.length > 0) {
    const ent = ufMk.reduce((s, r) => s + (r.ent || 0), 0);
    const fp = ufMk.reduce((s, r) => s + (r.fp || 0), 0);
    const np = ufMk.reduce((s, r) => s + (r.np !== undefined ? r.np : Math.max(0, (r.ent || 0) - (r.fp || 0) - (r.spEnt || 0))), 0);
    const spEnt = ufMk.reduce((s, r) => s + (r.spEnt || 0), 0);
    const ab = ufMk.reduce((s, r) => s + (r.ab || 0), 0);
    const abAt = ufMk.reduce((s, r) => s + (r.abAt || 0), 0);
    const abNP = ufMk.reduce((s, r) => s + (r.abNP || 0), 0);
    const spAb = ufMk.reduce((s, r) => s + (r.spAb || 0), 0);
    return { ...raw, ent, np, fp, spEnt, ab, abAt, abNP, spAb, dMedEnt: raw?.dMedEnt || 0, dMedAb: raw?.dMedAb || 0 };
  }
  const ufHard = S.UF_RAW.filter(r => !r._mes);
  const ufHardFilt = ufHard.filter(r => {
    if (S.fUF !== "Todos" && r.uf !== S.fUF) return false;
    if (S.fUV !== "Todos" && r.uv !== S.fUV) return false;
    if (S.fEmp !== "Todas" && r.emp !== S.fEmp) return false;
    if (S.fSi !== "Todos" && r.si !== S.fSi) return false;
    if (S.fUL !== "Todos" && r.ul !== S.fUL) return false;
    if (S.fTR !== "Todos" && !(r.trs && r.trs.includes(S.fTR))) return false;
    if (S.fRC !== "Todos" && r.rc !== S.fRC) return false;
    if (S.fCI !== "Todos" && r.cidade !== S.fCI) return false;
    return true;
  });
  const totEnt = ufHard.reduce((s, r) => s + r.ent, 0) || 1;
  const totAb = ufHard.reduce((s, r) => s + r.ab, 0) || 1;
  const rEnt = ufHardFilt.reduce((s, r) => s + r.ent, 0) / totEnt;
  const rAb = ufHardFilt.reduce((s, r) => s + r.ab, 0) / totAb;
  return {
    ...raw,
    ent: Math.round((raw?.ent || 0) * rEnt), np: Math.round((raw?.np || 0) * rEnt),
    fp: Math.round((raw?.fp || 0) * rEnt), spEnt: Math.round((raw?.spEnt || 0) * rEnt),
    ab: Math.round((raw?.ab || 0) * rAb), abNP: Math.round((raw?.abNP || 0) * rAb),
    abAt: Math.round((raw?.abAt || 0) * rAb), spAb: Math.round((raw?.spAb || 0) * rAb)
  };
}

/* ── getAGMes — aging para qualquer mês ────────────────────── */
export function getAGMes(mk, tipo) {
  if (!tipo) tipo = "abrt";
  const isAbertos = tipo === "abrt";
  const _agr = S.AG_RAW[mk] || {};
  const raw = isAbertos
    ? { a1: _agr.ab_a1 || 0, a2: _agr.ab_a2 || 0, a6: _agr.ab_a6 || 0, a16: _agr.ab_a16 || 0, a31: _agr.ab_a31 || 0 }
    : (S.DB_RAW[mk]?.agF || { a1: 0, a2: 0, a6: 0, a16: 0, a31: 0 });
  const ufRows = getUF();

  const agFieldAb = r => (r.ag_ab_a1 || 0) + (r.ag_ab_a2 || 0) + (r.ag_ab_a6 || 0) + (r.ag_ab_a16 || 0) + (r.ag_ab_a31 || 0);
  const agFieldF = r => (r.ag_a1 || 0) + (r.ag_a2 || 0) + (r.ag_a6 || 0) + (r.ag_a16 || 0) + (r.ag_a31 || 0);
  const hasUFab = ufRows.some(r => r._mes && agFieldAb(r) > 0);
  const hasUFf = ufRows.some(r => r._mes && agFieldF(r) > 0);

  if (S.fTR !== "Todos") {
    const trRows = getTR();
    const trAb = trRows.some(r => r._mes && agFieldAb(r) > 0);
    const trF = trRows.some(r => r._mes && agFieldF(r) > 0);
    if (isAbertos && trAb)
      return { a1: trRows.reduce((s, r) => s + (r.ag_ab_a1 || 0), 0), a2: trRows.reduce((s, r) => s + (r.ag_ab_a2 || 0), 0), a6: trRows.reduce((s, r) => s + (r.ag_ab_a6 || 0), 0), a16: trRows.reduce((s, r) => s + (r.ag_ab_a16 || 0), 0), a31: trRows.reduce((s, r) => s + (r.ag_ab_a31 || 0), 0) };
    if (!isAbertos && trF)
      return { a1: trRows.reduce((s, r) => s + (r.ag_a1 || 0), 0), a2: trRows.reduce((s, r) => s + (r.ag_a2 || 0), 0), a6: trRows.reduce((s, r) => s + (r.ag_a6 || 0), 0), a16: trRows.reduce((s, r) => s + (r.ag_a16 || 0), 0), a31: trRows.reduce((s, r) => s + (r.ag_a31 || 0), 0) };
  }

  if (isAbertos && hasUFab)
    return { a1: ufRows.reduce((s, r) => s + (r.ag_ab_a1 || 0), 0), a2: ufRows.reduce((s, r) => s + (r.ag_ab_a2 || 0), 0), a6: ufRows.reduce((s, r) => s + (r.ag_ab_a6 || 0), 0), a16: ufRows.reduce((s, r) => s + (r.ag_ab_a16 || 0), 0), a31: ufRows.reduce((s, r) => s + (r.ag_ab_a31 || 0), 0) };
  if (!isAbertos && hasUFf)
    return { a1: ufRows.reduce((s, r) => s + (r.ag_a1 || 0), 0), a2: ufRows.reduce((s, r) => s + (r.ag_a2 || 0), 0), a6: ufRows.reduce((s, r) => s + (r.ag_a6 || 0), 0), a16: ufRows.reduce((s, r) => s + (r.ag_a16 || 0), 0), a31: ufRows.reduce((s, r) => s + (r.ag_a31 || 0), 0) };

  const semFiltro = S.fUF === "Todos" && S.fUV === "Todos" && S.fEmp === "Todas" && S.fSi === "Todos" && S.fUL === "Todos" && S.fTR === "Todos" && S.fRC === "Todos" && S.fCI === "Todos";
  if (semFiltro) return raw;
  const base = S.UF_RAW.filter(r => !r._mes || r._mes === mk);
  const totAb = base.reduce((s, r) => s + r.ab, 0) || 1;
  const ratio = ufRows.reduce((s, r) => s + r.ab, 0) / totAb;
  return { a1: Math.round(raw.a1 * ratio), a2: Math.round(raw.a2 * ratio), a6: Math.round(raw.a6 * ratio), a16: Math.round(raw.a16 * ratio), a31: Math.round(raw.a31 * ratio) };
}

/* ── renderValidacao ───────────────────────────────────────── */
export function renderValidacao(mk, db, sla) {
  const bd = document.getElementById('val-bd');
  if (!bd) return;
  const ref = VAL_REF[mk];
  const mesLabel = { 'jan-2026': 'Janeiro/2026', 'fev-2026': 'Fevereiro/2026', 'mar-2026': 'Março/2026' }[mk] || mk;
  const totalCar = db.ent + db.ab;
  if (!ref) {
    bd.innerHTML = `<div class="val-mes">${mesLabel}</div><div style="color:#94a3b8;font-size:12px">Sem referência para este mês</div>`;
    return;
  }
  const refEnt = db.np + db.fp + db.spEnt;
  const refAb = (db.abNP || 0) + db.abAt + db.spAb;
  const refTotal = db.ent + db.ab;

  function vc(a, b, lbl) {
    const ok = a === b;
    return `<div class="vc ${ok ? 'vok' : 'vng'}">
      <span class="vc-i">${ok ? '✓' : '✗'}</span>
      <span class="vc-l">${lbl}</span>
      <span class="vc-v">${fm(a)}</span>
      <span class="vc-r">ref: ${fm(b)}</span>
      ${!ok ? `<span class="vc-d">(Δ ${a > b ? '+' : ''}${fm(a - b)})</span>` : ''}
    </div>`;
  }

  let html = '<div class="val-mes">' + mesLabel + '</div>';
  html += vc(refTotal, ref.total, 'Total Carregado');
  html += vc(refEnt, ref.entregues, 'Entregues');
  html += vc(refAb, ref.abertos, 'Abertos');
  bd.innerHTML = html;
}
