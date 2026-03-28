/* ═══════════════════════════════════════════════════════════════
   MODULE: config.js
   Constantes de configuração do dashboard — sem dependências
   ═══════════════════════════════════════════════════════════════ */

/* ── Configuração de Views (elimina hardcodes) ─────────────── */
export const VIEW_CONFIG = {
  UF:  { field: 'uf',      label: 'UF',                short: 'UF'  },
  TR:  { field: 'tr',      label: 'Transportadora',    short: 'TR'  },
  UV:  { field: 'uv',      label: 'Unidade de Venda',  short: 'UV'  },
  CI:  { field: 'cidade',  label: 'Cidade',            short: 'CI'  },
  RE:  { field: 'regiao',  label: 'Região',            short: 'RE'  },
  RC:  { field: 'rc',      label: 'Rep. Comercial',    short: 'RC'  },
  UL:  { field: 'ul',      label: 'Unidade Logística', short: 'UL'  },
};

/* ── Labels de meses (constante) ───────────────────────────── */
export const MESES_L = ["Jan/26","Fev/26","Mar/26"];

/* ── Empresas estáticas ────────────────────────────────────── */
export const EMPRESAS = ["Todas","FERRAGENS NEGRÃO","ATACADÃO DAS FERRAMENTAS","FERRAMENTAS KENNEDY",
  "TBR ADESIVOS E SELANTES","KALA COMERCIO E DISTRIB.","MATSUYAMA",
  "WORKER COM. FERRAMENTAS","WBR EQUIP. PARA PINTURA","COLLINS FERRAMENTAS","SUPER PRO"];

/* ── Sistemas de venda ─────────────────────────────────────── */
export const SISTEMAS = ["Todos","ACACIA","US4","VTEX"];

/* ── Unidades logísticas estáticas ─────────────────────────── */
export const UNI_LOG = ["Todos", "3 - NEGRAO - GO", "4 - NEGRAO - BA", "5 - NEGRAO - MT", "6 - NEGRAO - MA", "8 - NEGRAO - PR", "18 - NEGRAO-MARITUBA", "22 - NEGRAO-RJ", "25 - NEGRAO-FORTALEZ", "33 - NEGRAO-PVH", "36 - MANAUS - 036", "37 - NEGRAO-TO-37", "40 - NEGRAO-GUAIBA", "41 - NEGRAO-ARAPIRAC", "42 - NEGRAO - MG", "43 - NEGRAO-CAPIVARI", "46 - NEGRAO-PB", "51 - NEGRAO - MS", "54 - NEGRAO-GARUVA", "57 - NEGRAO - ES", "301 - TBR", "302 - MATSUYAMA", "305 - WBR EQUIP LTDA"];

/* ── Aliases de transportadoras (normalização) ─────────────── */
export const TR_ALIASES = {
  'DISMARINA TRANSPORTES RODOVIARIOS L':'DISMARINA TRANSP RODOVIARIOS LTDA',
  'LOGISTICA E TRANSP SAO LUIZ LTDA':'LOGISTICA E TRANS SAO LUIZ (LTSL)',
  'LOGISTICA E TRANS SAO LUIZ LTDA':'LOGISTICA E TRANS SAO LUIZ (LTSL)',
  'GUANABARA EXPRESS TRANSPORTE DE CAR':'GUANABARA EXPRESS TRANSP CARGA LTDA',
  'REUNIDAS TRANSPORT RODOV CARGAS S':'REUNIDAS TRANSP RODOV CARGAS S/A',
  'R.P.A. TRANSPORTES E LOGISTICA LTDA':'R P A TRANSPORTES E LOGISTICA LTDA',
  'RPA TRANSPORTES E LOGISTICA LTDA':'RPA TRANSPORTES E LOGISTICA',
  'CARVALIMA TRANSPORTES LTDA':'CARVALIMA TRANSPORTE LTDA',
  'PLAV TRANSPORTADORA LTDA ME':'PLAV TRANSPORTADORA LTDA',
  'ACCERT TRANSPORTES E LOGISTICA LTDA':'ACCERT TRANSPORTES',
};

/* ── Feriados (para cálculo de horas úteis) ────────────────── */
export const FERIADOS_SET = new Set(['2025-01-01','2025-04-18','2025-04-21','2025-05-01','2025-06-19','2025-09-07','2025-10-12','2025-11-02','2025-11-15','2025-11-20','2025-12-25','2026-01-01','2026-04-03','2026-04-21','2026-05-01','2026-06-04','2026-09-07','2026-10-12','2026-11-02','2026-11-15','2026-11-20','2026-12-25']);

/* ── Referências de validação (para renderValidacao) ───────── */
export const VAL_REF = {
  'jan-2026': { total: 7771, entregues: 7240, abertos: 531 },
  'fev-2026': { total: 8490, entregues: 8063, abertos: 427 },
  'mar-2026': { total: 7371, entregues: 6217, abertos: 1154 },
};

/* ── Debug flags ───────────────────────────────────────────── */
export const _DEBUG = typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG') === '1';
export const _log = _DEBUG ? console.log.bind(console) : ()=>{};
export const _warn = _DEBUG ? console.warn.bind(console) : ()=>{};
