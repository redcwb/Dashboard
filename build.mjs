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

const SRC  = resolve('src/index.html');
const DIST = resolve('dist/index.html');
const watch = process.argv.includes('--watch');

async function build() {
  console.log('[build] Lendo src/index.html...');
  let html = readFileSync(SRC, 'utf-8');

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

  // ── 4. Gravar dist/index.html ──────────────────────────────────────
  mkdirSync('dist', { recursive: true });
  writeFileSync(DIST, html, 'utf-8');

  const srcSize  = readFileSync(SRC).length;
  const distSize = Buffer.byteLength(html, 'utf-8');
  const reduction = (((srcSize - distSize) / srcSize) * 100).toFixed(1);

  console.log(`\n✅ Build concluído!`);
  console.log(`   src/index.html  → ${(srcSize/1024).toFixed(0)}KB`);
  console.log(`   dist/index.html → ${(distSize/1024).toFixed(0)}KB`);
  console.log(`   Redução: ${reduction}%\n`);
}

if (watch) {
  console.log('[build] Modo watch não implementado ainda — rode node build.mjs após cada edição.');
  await build();
} else {
  await build();
}
