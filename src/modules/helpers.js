/* ═══════════════════════════════════════════════════════════════
   MODULE: helpers.js
   Formatação e componentes HTML reutilizáveis
   Depende de: state.js
   ═══════════════════════════════════════════════════════════════ */

import S from './state.js';

/* ── Formatação ────────────────────────────────────────────── */
export const fm  = v => v == null ? "-" : Number(v).toLocaleString("pt-BR");
export const f1  = v => Number(v).toFixed(1);
export const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

/* ── Semáforo de atraso ────────────────────────────────────── */
export function sem(p) {
  const t = S.SLA_THRESHOLDS.atraso;
  if (p <= t.green) return { cls: "bok", txt: "✓ OK" };
  if (p <= t.yellow) return { cls: "bwn", txt: "⚠ ATENÇÃO" };
  return { cls: "bct", txt: "✗ CRÍTICO" };
}

export function pBdg(p) { const s = sem(p); return `<span class="bdg ${s.cls}">${p}%</span>`; }

/* ── KPI Card ──────────────────────────────────────────────── */
export function kcard(lb, val, sub, vCol, cls, tip = "", drill = "", delta = "") {
  const clk = drill ? ` onclick="drillDown('${drill}')" style="cursor:pointer"` : ' ';
  return `<div class="kc ${cls || ""}" tabindex="0"${clk}>
    <div class="kc-lb">${lb}${tip ? `<span class="tt-w" style="margin-left:3px">ⓘ<span class="tt">${tip}</span></span>` : ""}</div>
    <div class="kc-v" style="color:${vCol || "var(--tx)"}">${val}</div>
    <div class="kc-s">${sub || ""}${delta ? ` <span style="font-size:10px;font-weight:700;color:${delta.startsWith('▲') ? (/atraso|fora/i.test(lb) ? 'var(--R)' : 'var(--G)') : ((/atraso|fora/i.test(lb) ? 'var(--G)' : 'var(--R)'))}">${delta}</span>` : ""}</div>
  </div>`;
}

/* ── Delta entre meses ─────────────────────────────────────── */
export function getDelta(curVal, prevVal, suffix = '') {
  if (prevVal === null || prevVal === undefined || prevVal === 0) return '';
  const diff = curVal - prevVal;
  const pctChg = Math.round(Math.abs(diff) / prevVal * 100);
  if (pctChg === 0) return '';
  const arrow = diff > 0 ? '▲' : '▼';
  return arrow + ' ' + pctChg + '%' + (suffix ? ' ' + suffix : '');
}

export function getPrevMes() {
  const idx = S.MESES_K.indexOf(S.mes);
  if (idx <= 0) return null;
  return S.MESES_K[idx - 1];
}

/* ── SLA Box ───────────────────────────────────────────────── */
export function sbox(p, lb) {
  const s = sem(p);
  const pal = { bok: { bg: "#F0FDF4", b: "#BBF7D0", c: "#166534" }, bwn: { bg: "#FEFCE8", b: "#FDE68A", c: "#92400E" }, bct: { bg: "#FEF2F2", b: "#FECACA", c: "#991B1B" } };
  const { bg, b, c } = pal[s.cls];
  return `<div class="sb" style="background:${bg};border-color:${b}">
    <div class="sb-lb" style="color:${c}99">${lb}</div>
    <div class="sb-v" style="color:${c}">${p}%</div>
    <span class="bdg ${s.cls}">${s.txt}</span>
  </div>`;
}

/* ── Gauge SVG ─────────────────────────────────────────────── */
export function gauge(p) {
  const r = 31, circ = 2 * Math.PI * r, off = circ * (1 - p / 100);
  const col = p >= S.SLA_THRESHOLDS.pontualidade.green ? "#15803d" : p >= S.SLA_THRESHOLDS.pontualidade.yellow ? "#b45309" : "#DC2626";
  const st = p >= S.SLA_THRESHOLDS.pontualidade.green ? "Bom" : p >= S.SLA_THRESHOLDS.pontualidade.yellow ? "Atenção" : "Crítico";
  return `<div class="gd" role="img" aria-label="SLA ${p}% — ${st}">
    <svg width="66" height="66" viewBox="0 0 66 66" aria-hidden="true">
      <circle cx="33" cy="33" r="${r}" fill="none" stroke="#E2E8F0" stroke-width="6"/>
      <circle cx="33" cy="33" r="${r}" fill="none" stroke="${col}" stroke-width="6"
        stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        stroke-linecap="round" transform="rotate(-90 33 33)" style="transition:stroke-dashoffset .6s"/>
    </svg>
    <div class="gp" style="color:${col}" aria-hidden="true">${p}%</div>
  </div>`;
}

/* ── Aging Cards ───────────────────────────────────────────── */
export function agingCard(a, sel, isClicavel, onCl) {
  const selCls = sel ? " sel" : "";
  const ncCls = isClicavel ? "" : " nc";
  const hint = isClicavel ? `<div class="ag-ht">▾ TRs</div>` : "";
  const kb = isClicavel ? `tabindex="0" role="button" aria-pressed="${sel}" onkeydown="if(event.key==='Enter'||event.key===' '){${onCl}}"` : ""
  return `<div class="agc${selCls}${ncCls}" style="background:${a.bg};border-color:${a.bc}"
      onclick="${isClicavel ? onCl : ''}" ${kb}>
    ${hint}
    <div class="ag-lb">${a.lbl}</div>
    <div class="ag-v" style="color:${a.c}">${fm(a.val)}</div>
    <div class="ag-p" style="color:${a.c}99">${a.pct}% ${a.ptxt || ""}</div>
    <div class="ag-b" style="background:${a.c};width:${Math.round(a.val / (a.tot || 1) * 100)}%"></div>
  </div>`;
}

export function buildAgItems(raw, total, prefixo, ptxt) {
  const faixas = [
    { key: "a1", lbl: `${prefixo} 1 Dia`, c: "#D97706", bg: "#FFFBEB", bc: "#FDE68A" },
    { key: "a2", lbl: `${prefixo} 2–5 Dias`, c: "#EA580C", bg: "#FFF7ED", bc: "#FED7AA" },
    { key: "a6", lbl: `${prefixo} 6–15 Dias`, c: "#DC2626", bg: "#FEF2F2", bc: "#FECACA" },
    { key: "a16", lbl: `${prefixo} 16–30 Dias`, c: "#991b1b", bg: "#FFF1F2", bc: "#FECDD3" },
    { key: "a31", lbl: `${prefixo} Acima 30`, c: "#7F1D1D", bg: "#FFF1F2", bc: "#FECDD3" },
  ];
  return faixas.map(f => ({ ...f, val: raw[f.key] || 0, tot: total, pct: pct(raw[f.key] || 0, total), ptxt }));
}
