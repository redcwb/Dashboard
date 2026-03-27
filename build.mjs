/**
 * build.mjs — Script de build para minificação do dashboard
 *
 * O que faz:
 *   1. Lê src/index.html (legível, você edita aqui)
 *   2. Extrai o bloco <script> principal
 *   3. Minifica com esbuild (renomeia variáveis, remove comentários, comprime)
 *   4. Extrai o bloco <style> principal
 *   5. Minifica o CSS
 *   6. Reinjecta tudo no HTML → dist/index.html
 *
 * Uso:
 *   node build.mjs          → gera dist/index.html
 *   node build.mjs --watch  → rebuld automático ao salvar (dev)
 *
 * Compatível com: Vercel, Oracle Cloud, qualquer servidor estático
 */

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const watch = process.argv.includes('--watch');

async function buildFile(srcPath, distPath) {
  console.log(`[build] Lendo ${srcPath}...`);
  let html = readFileSync(srcPath, 'utf-8');

  // ── 1. Extrair e minificar JS ──────────────────────────────────────
  // Captura o bloco <script> que NÃO seja CDN externo
  const scriptRegex = /<script(?![^>]*src=)(?![^>]*type="module")[^>]*>([\s\S]*?)<\/script>/g;
  const scripts = [];
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1].trim().length > 100) { // ignora scripts minúsculos (analytics, etc)
      scripts.push({ full: match[0], content: match[1] });
    }
  }

  if (scripts.length === 0) {
    console.error('[build] ERRO: Nenhum bloco <script> inline encontrado.');
    process.exit(1);
  }

  console.log(`[build] ${scripts.length} bloco(s) JS encontrado(s). Minificando...`);

  for (const s of scripts) {
    const result = await esbuild.transform(s.content, {
      loader: 'js',
      minify: true,
      minifyIdentifiers: true,   // renomeia variáveis internas
      minifySyntax: true,        // simplifica expressões
      minifyWhitespace: true,    // remove espaços
      target: 'es2019',          // compatível com browsers modernos
      legalComments: 'none',     // remove todos os comentários
    });

    html = html.replace(s.full, `<script>${result.code}</script>`);
    console.log(`[build] JS: ${(s.content.length/1024).toFixed(1)}KB → ${(result.code.length/1024).toFixed(1)}KB`);
  }

  // ── 2. Extrair e minificar CSS ─────────────────────────────────────
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;
  const styles = [];

  while ((match = styleRegex.exec(html)) !== null) {
    if (match[1].trim().length > 50) {
      styles.push({ full: match[0], content: match[1] });
    }
  }

  console.log(`[build] ${styles.length} bloco(s) CSS encontrado(s). Minificando...`);

  for (const s of styles) {
    const result = await esbuild.transform(s.content, {
      loader: 'css',
      minify: true,
      legalComments: 'none',
    });

    html = html.replace(s.full, `<style>${result.code}</style>`);
    console.log(`[build] CSS: ${(s.content.length/1024).toFixed(1)}KB → ${(result.code.length/1024).toFixed(1)}KB`);
  }

  // ── 3. Remover comentários HTML ────────────────────────────────────
  const beforeComments = html.length;
  html = html.replace(/<!--(?!(\[if|!))[\s\S]*?-->/g, '');
  console.log(`[build] Comentários HTML removidos: ${((beforeComments - html.length)/1024).toFixed(1)}KB`);

  // ── 4. Gravar arquivo dist ─────────────────────────────────────────
  mkdirSync('dist', { recursive: true });
  writeFileSync(distPath, html, 'utf-8');

  const srcSize  = readFileSync(srcPath).length;
  const distSize = Buffer.byteLength(html, 'utf-8');
  const reduction = (((srcSize - distSize) / srcSize) * 100).toFixed(1);
  const name = srcPath.split('/').pop();
  console.log(`   ${name}: ${(srcSize/1024).toFixed(0)}KB → ${(distSize/1024).toFixed(0)}KB (-${reduction}%)`);
}

async function build() {
  mkdirSync('dist', { recursive: true });
  await buildFile(resolve('src/index.html'), resolve('dist/index.html'));

  // Build do admin.html — opcional, só se existir em src/
  try {
    const { existsSync } = await import('fs');
    if (existsSync(resolve('src/admin.html'))) {
      await buildFile(resolve('src/admin.html'), resolve('dist/admin.html'));
    } else if (existsSync(resolve('admin.html'))) {
      // Fallback: copiar da raiz para dist/ sem minificar
      const adminContent = readFileSync(resolve('admin.html'), 'utf-8');
      writeFileSync(resolve('dist/admin.html'), adminContent, 'utf-8');
      console.log('   admin.html copiado da raiz → dist/');
    }
  } catch(e) {
    console.warn('   admin.html não processado:', e.message);
  }

  // Copiar admin.html da raiz para dist/ (Vercel serve de lá)
  const adminSrc = resolve('admin.html');
  const adminDist = resolve('dist/admin.html');
  try {
    const adminContent = readFileSync(adminSrc, 'utf-8');
    writeFileSync(adminDist, adminContent, 'utf-8');
    console.log(`   admin.html copiado para dist/`);
  } catch(e) {
    console.warn('   admin.html não encontrado na raiz — pulando');
  }

  console.log('\n✅ Build concluído!\n');
}

if (watch) {
  console.log('[build] Modo watch não implementado — rode node build.mjs após cada edição.');
  await build();
} else {
  await build();
}
