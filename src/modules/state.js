/* ═══════════════════════════════════════════════════════════════
   MODULE: state.js
   Estado centralizado — substitui 34 globais mutáveis por 1 objeto
   Depende de: nada (puro)
   ═══════════════════════════════════════════════════════════════ */

/* ── Estado único da aplicação ─────────────────────────────── */
const S = {
  // Mês e view ativos
  mes: 'mar-2026',
  fVis: 'T',
  view: 'UF',
  secTab: 'vg',

  // Filtros
  fEmp: 'Todas', fSi: 'Todos', fUL: 'Todos', fUV: 'Todos',
  fUF: 'Todos', fTR: 'Todos', fRC: 'Todos', fCI: 'Todos',

  // Transportadoras scorecard
  trFiltCrit: 'all',

  // Dados brutos (populados via Supabase/IndexedDB/upload)
  DB_RAW: {},
  AG_RAW: {},
  SLA_CACHE: {},
  PEDIDOS_RAW: [],
  UF_RAW: [],
  TR_RAW: [],
  MESES_K: [],

  // Dimensões derivadas (recalculadas em recalcDims)
  UNI_VDA: ['Todos'],
  UFS: ['Todos'],
  TRS: ['Todos'],
  EMPS_D: ['Todas'],
  SIS_D: ['Todos'],
  UL_D: ['Todos'],
  RCS_D: ['Todos'],
  CIDADES_D: ['Todos'],

  // Tabela
  tSort: 'fp', tDir: 1, tPage: 0, busca: '', destHigh: '',

  // Painel de comparativo/evolução
  cpOpen: false, cpCur: 1,

  // Aging selection
  agAbSel: null, agFeSel: null,

  // Evolução view
  evView: 'detail',
  evSeries: ['NP','FP','AB','ABA'],

  // Chart instances (Chart.js)
  CI: {},

  // Supabase
  SUPABASE_URL: null,
  SUPABASE_ANON_KEY: null,
  supaClient: null,
  SUPA_AVAILABLE: false,
  SUPA_USER: null,
  SUPA_USER_ROLE: null,
  DATA_OWNER_ID: null,
  authMode: 'login',

  // IndexedDB
  db: null,
  DB_AVAILABLE: false,

  // SLA e Regiões (carregados do Supabase via get_dims)
  REGIAO_MAP: {},
  SLA_THRESHOLDS: {
    pontualidade: { green: 95, yellow: 90 },
    atraso:       { green: 10, yellow: 20 },
    pendentes:    { green: 2,  yellow: 5  },
  },
};

/* ── Acesso direto ao State (todas as leituras/escritas passam por aqui) ── */
export default S;
