#!/usr/bin/env node

/**
 * Generate OG image for a course page.
 *
 * Renders a purpose-built 1200×630 card with clear information hierarchy
 * instead of screenshotting the page. Uses course config (badge, hero_title,
 * subtitle) and global config (instructor name/tagline).
 *
 * Usage:
 *   node generate-og.mjs <course-dir>
 *   # e.g. node generate-og.mjs example
 *
 * Requirements:
 *   npm install --save-dev puppeteer
 */

import { existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import puppeteer from 'puppeteer';
import { loadConfig } from './build.mjs';

// ─── Escape HTML ───

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Build OG card HTML ───

function buildOgHtml(cfg) {
  const badge = cfg.page?.badge || '';
  const title = (cfg.page?.hero_title || cfg.page?.title || '')
    .replace(/<br\s*\/?>/gi, '<br>');
  const subtitle = cfg.page?.subtitle || cfg.seo?.description || '';

  return /* html */ `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&family=Noto+Serif+TC:wght@700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    font-family: 'Noto Sans TC', sans-serif;
    background: #f5f5f7;
    color: #1a1a2e;
    position: relative;
  }

  /* ── Subtle gradient orbs (background decoration) ── */
  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    pointer-events: none;
  }
  .orb--accent {
    width: 600px; height: 600px;
    background: #e8845a;
    opacity: 0.08;
    top: -200px; right: -100px;
  }
  .orb--accent2 {
    width: 500px; height: 500px;
    background: #e8b878;
    opacity: 0.07;
    bottom: -180px; left: -80px;
  }
  .orb--accent3 {
    width: 350px; height: 350px;
    background: #e08898;
    opacity: 0.05;
    bottom: 60px; right: 250px;
  }

  /* ── Content layout ── */
  .card {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 63px 80px;
  }

  /* ── Badge ── */
  .badge {
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #c45c28;
    margin-bottom: 36px;
    line-height: 1;
    white-space: nowrap;
  }

  /* ── Title ── */
  .title {
    font-family: 'Noto Serif TC', serif;
    font-weight: 700;
    font-size: 78px;
    line-height: 1.3;
    letter-spacing: -0.01em;
    background: linear-gradient(135deg, #1a1a2e 30%, #c45c28 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 32px;
    max-width: 1040px;
  }

  /* ── Subtitle ── */
  .subtitle {
    font-size: 36px;
    line-height: 1.6;
    color: #5a5b6a;
    max-width: 1040px;
  }

  /* ── Accent line (top decoration) ── */
  .accent-line {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 4px;
    background: linear-gradient(90deg, #e8845a 0%, #e8b878 50%, #e08898 100%);
  }
</style>
</head>
<body>
  <div class="accent-line"></div>
  <div class="orb orb--accent"></div>
  <div class="orb orb--accent2"></div>
  <div class="orb orb--accent3"></div>

  <div class="card">
    ${badge ? `<div class="badge">${esc(badge)}</div>` : ''}
    <div class="title">${title}</div>
    ${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ''}
  </div>

  <script>
    document.fonts.ready.then(() => {
      const badgeEl = document.querySelector('.badge');
      const titleEl = document.querySelector('.title');
      const subtitleEl = document.querySelector('.subtitle');
      const cardH = 630 * 0.8; // available height (10% padding top+bottom)
      const contentW = 1040;
      const gap = 32;
      const gaps = (badgeEl ? 1 : 0) + (subtitleEl ? 1 : 0);

      function fitsWidth(el, size, lh, maxLines) {
        el.style.fontSize = size + 'px';
        el.style.lineHeight = String(lh);
        el.style.maxWidth = contentW + 'px';
        // Allow tolerance for font descenders/ascenders
        return el.scrollHeight <= Math.ceil(size * lh * maxLines) + size * 0.3;
      }

      function totalH(ts) {
        const bs = Math.round(ts * 4 / 8);
        const ss = Math.round(ts * 3 / 8);
        let h = ts * 1.3 * 2 + ts * 0.3; // title 2 lines + font metrics
        if (badgeEl) h += bs * 1.2; // badge 1 line
        if (subtitleEl) h += ss * 1.6 * 2 + ss * 0.3; // subtitle 2 lines
        h += gaps * gap;
        return h;
      }

      // Find max title size: fits width AND total height fits card
      let ts = 140;
      for (; ts >= 40; ts -= 2) {
        if (totalH(ts) > cardH) continue;
        if (!fitsWidth(titleEl, ts, 1.3, 2)) continue;
        const ss = Math.round(ts * 3 / 8);
        if (subtitleEl && !fitsWidth(subtitleEl, ss, 1.6, 2)) continue;
        break;
      }

      titleEl.style.fontSize = ts + 'px';
      titleEl.style.lineHeight = '1.3';
      if (badgeEl) badgeEl.style.fontSize = Math.round(ts * 4 / 8) + 'px';
      if (subtitleEl) {
        subtitleEl.style.fontSize = Math.round(ts * 3 / 8) + 'px';
        subtitleEl.style.lineHeight = '1.6';
      }
    });
  </script>
</body>
</html>`;
}

// ─── Main ───

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage:');
    console.log('  node generate-og.mjs <course-dir>   # e.g. node generate-og.mjs example');
    process.exit(1);
  }

  const courseDir = resolve(args[0]);
  const assetsDir = join(courseDir, 'assets');
  if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true });
  const outputPath = join(assetsDir, 'og-image.jpg');

  const { cfg } = loadConfig(courseDir);

  const html = buildOgHtml(cfg);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for web fonts to be fully loaded
    await page.waitForFunction(() => document.fonts.ready.then(() => document.fonts.size > 0), { timeout: 8000 }).catch(() => {
      console.warn('   ⚠️  Font loading timed out, using fallback fonts');
    });
    await new Promise((r) => setTimeout(r, 300));

    await page.screenshot({
      path: outputPath,
      fullPage: false,
      type: 'jpeg',
      quality: 92,
    });

    console.log(`✅ Generated OG image: ${outputPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ Failed to generate OG image:');
  console.error(err);
  process.exit(1);
});
