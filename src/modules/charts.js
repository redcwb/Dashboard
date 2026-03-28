/* ═══════════════════════════════════════════════════════════════
   MODULE: charts.js
   Gráficos Chart.js — evolução mensal
   Depende de: state.js, config.js, data.js, helpers.js
   ═══════════════════════════════════════════════════════════════ */

import S from './state.js';
import { MESES_L } from './config.js';
import { getDBMes, getAGMes } from './data.js';
import { fm, pct } from './helpers.js';

const baseO = {
  responsive: true, maintainAspectRatio: true, interaction: { mode: "index", intersect: false },
  plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0F172A", titleColor: "#93c5fd", bodyColor: "#fff", padding: 10, cornerRadius: 8, callbacks: { label: c => " " + c.dataset.label + ": " + fm(c.raw) } } },
  scales: { x: { grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "#93c5fd", font: { family: "'JetBrains Mono'", size: 10 } } }, y: { grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "#93c5fd", font: { family: "'JetBrains Mono'", size: 10 }, callback: v => fm(v) } } }
};
const pctO = { ...JSON.parse(JSON.stringify(baseO)) };
pctO.scales.y.ticks.callback = v => v + "%"; pctO.scales.y.max = 100;

function dC(id) { if (S.CI[id]) { S.CI[id].destroy(); delete S.CI[id]; } }

export function buildCharts() {
  const L = MESES_L;
  const DK = S.MESES_K.map(k => getDBMes(k));

  const ent = DK.map(d => d.ent), np = DK.map(d => d.np), fp = DK.map(d => d.fp);
  const ab = DK.map(d => d.ab), abAt = DK.map(d => d.abAt);
  const slaL = DK.map(d => pct(d.np, d.ent));
  const pAtL = DK.map(d => pct(d.abAt, d.ab));
  const pFcL = DK.map(d => pct(d.fp, d.ent));

  dC("ch1"); S.CI.ch1 = new Chart(document.getElementById("ch1"), { type: "line", data: { labels: L, datasets: [
    { label: "Entregues", data: ent, borderColor: "#60a5fa", backgroundColor: "rgba(96,165,250,.12)", fill: true, tension: .35, pointRadius: 4, pointHoverRadius: 6 },
    { label: "No Prazo", data: np, borderColor: "#4ade80", backgroundColor: "rgba(74,222,128,.08)", fill: true, tension: .35, pointRadius: 4, borderDash: [5, 3] },
    { label: "Fora Prazo", data: fp, borderColor: "#f87171", backgroundColor: "rgba(248,113,113,.08)", fill: true, tension: .35, pointRadius: 4, borderDash: [2, 3] }
  ] }, options: baseO });

  dC("ch2"); S.CI.ch2 = new Chart(document.getElementById("ch2"), { type: "line", data: { labels: L, datasets: [
    { label: "SLA Entrega %", data: slaL, borderColor: "#60a5fa", backgroundColor: "rgba(96,165,250,.12)", fill: true, tension: .35, pointRadius: 5 },
    { label: "% Atraso Abertos", data: pAtL, borderColor: "#f87171", backgroundColor: "rgba(248,113,113,.08)", fill: true, tension: .35, pointRadius: 5, borderDash: [5, 3] },
    { label: "% Atraso Fechados", data: pFcL, borderColor: "#fbbf24", fill: false, tension: .35, pointRadius: 5, borderDash: [2, 4] }
  ] }, options: pctO });

  dC("ch3"); S.CI.ch3 = new Chart(document.getElementById("ch3"), { type: "line", data: { labels: L, datasets: [
    { label: "Total Aberto", data: ab, borderColor: "#60a5fa", backgroundColor: "rgba(96,165,250,.12)", fill: true, tension: .35, pointRadius: 4, pointHoverRadius: 6 },
    { label: "Atrasados", data: abAt, borderColor: "#f87171", backgroundColor: "rgba(248,113,113,.08)", fill: true, tension: .35, pointRadius: 4, borderDash: [5, 3] }
  ] }, options: baseO });
}

export function showC(n) { S.cpCur = n; document.querySelectorAll(".cpill").forEach((el, i) => el.classList.toggle("on", i + 1 === n)); document.querySelectorAll(".cbox").forEach((el, i) => el.classList.toggle("on", i + 1 === n)); }

export function togCP() {
  S.cpOpen = !S.cpOpen;
  const p = document.getElementById("charts-panel"), b = document.getElementById("btn-cp");
  if (p) { p.classList.toggle("open", S.cpOpen); p.setAttribute("aria-hidden", !S.cpOpen); }
  if (b) { b.classList.toggle("on", S.cpOpen); b.setAttribute("aria-expanded", S.cpOpen); }
  const lbl = document.getElementById("cp-lbl");
  if (lbl) lbl.textContent = S.cpOpen ? "Ocultar Evolução" : "Ver Evolução";
  if (S.cpOpen) requestAnimationFrame(() => requestAnimationFrame(buildCharts));
}

export function rebuildChartsIfOpen() {
  if (S.cpOpen) requestAnimationFrame(() => requestAnimationFrame(buildCharts));
}
