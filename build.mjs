import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';

// ── Minificar src/index.html → dist/index.html ──
const src = readFileSync('src/index.html', 'utf8');

// Extrair <script> blocks, minificar com esbuild, reinserir
let out = src;
const scripts = [];
out = out.replace(/<script>([\s\S]*?)<\/script>/g, (match, code) => {
  if (code.trim().length < 100) return match; // skip tiny scripts
  scripts.push(code);
  return `<script>/*PLACEHOLDER_${scripts.length - 1}*/</script>`;
});

// Minificar cada script com esbuild
scripts.forEach((code, i) => {
  try {
    writeFileSync('/tmp/_build_chunk.js', code);
    execSync('npx esbuild /tmp/_build_chunk.js --minify --outfile=/tmp/_build_chunk.min.js', { stdio: 'pipe' });
    const minified = readFileSync('/tmp/_build_chunk.min.js', 'utf8');
    out = out.replace(`/*PLACEHOLDER_${i}*/`, minified);
  } catch (e) {
    console.warn(`⚠ Chunk ${i} não minificado:`, e.message);
    out = out.replace(`/*PLACEHOLDER_${i}*/`, code);
  }
});

// NÃO minificar HTML — preserva <label>, <input> e demais estruturas
// Apenas remover comentários HTML (exceto condicionais IE)
out = out.replace(/<!--(?!\[)[\s\S]*?-->/g, '');

mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', out);
console.log(`✅ dist/index.html: ${(out.length / 1024).toFixed(0)}KB (de ${(src.length / 1024).toFixed(0)}KB — ${Math.round((1 - out.length / src.length) * 100)}% menor)`);

// ── Copiar arquivos estáticos para dist/ ──
function copyIfExists(srcPath, destPath) {
  if (existsSync(srcPath)) {
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(srcPath, destPath);
    console.log(`📄 ${srcPath} → ${destPath}`);
  }
}

// CSS externo
copyIfExists('src/style.css', 'dist/style.css');

// Topojson
copyIfExists('src/data/brasil-topo.json', 'dist/data/brasil-topo.json');

// Módulos ES (para migração futura)
if (existsSync('src/modules')) {
  mkdirSync('dist/modules', { recursive: true });
  readdirSync('src/modules').filter(f => f.endsWith('.js')).forEach(f => {
    copyFileSync(join('src/modules', f), join('dist/modules', f));
    console.log(`📄 src/modules/${f} → dist/modules/${f}`);
  });
}

console.log('🚀 Build completo!');
