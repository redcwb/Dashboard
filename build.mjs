import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// ── Copiar src/index.html → dist/index.html (sem minificação) ──
mkdirSync('dist', { recursive: true });
copyFileSync('src/index.html', 'dist/index.html');
console.log('✅ dist/index.html copiado');

// ── Copiar CSS ──
if (existsSync('src/style.css')) {
  copyFileSync('src/style.css', 'dist/style.css');
  console.log('📄 dist/style.css copiado');
}

// ── Copiar topojson ──
if (existsSync('src/data/brasil-topo.json')) {
  mkdirSync('dist/data', { recursive: true });
  copyFileSync('src/data/brasil-topo.json', 'dist/data/brasil-topo.json');
  console.log('📄 dist/data/brasil-topo.json copiado');
}

// ── Copiar módulos ──
if (existsSync('src/modules')) {
  mkdirSync('dist/modules', { recursive: true });
  readdirSync('src/modules').filter(f => f.endsWith('.js')).forEach(f => {
    copyFileSync(join('src/modules', f), join('dist/modules', f));
    console.log('📄 dist/modules/' + f + ' copiado');
  });
}

// ── Copiar admin.html ──
if (existsSync('src/admin.html')) {
  copyFileSync('src/admin.html', 'dist/admin.html');
  console.log('📄 dist/admin.html copiado');
}

console.log('🚀 Build completo!');
