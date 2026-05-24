#!/usr/bin/env node
/**
 * Proposal PDF Builder — proposal-writer skill
 *
 * 將一份提案 README.md（YAML frontmatter + 六大區塊）轉成簡潔單欄的 PDF。
 * 講師介紹與品牌色由最近一層祖目錄的 config.yaml 注入。
 * PDF 樣式定義於 ../references/theme.css（美化只需編輯該檔）。
 *
 * Usage:
 *   node .agents/skills/proposal-writer/scripts/build-pdf.mjs <proposal-dir>
 *   e.g. node .agents/skills/proposal-writer/scripts/build-pdf.mjs proposal/todo/睿華國際
 *
 * 需求：puppeteer（repo 已安裝）
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const THEME_CSS = resolve(SCRIPT_DIR, '../references/theme.css');

// 固定六大區塊名稱 —— 用來決定區塊專屬排版
const SECTION = {
  INTRO: '課程簡介',
  TOOLS: '使用工具',
  OUTCOME: '預計成效',
  AUDIENCE: '適合對象',
  TOC: '課程目錄',
  SYLLABUS: '課程大綱',
};

// 區塊副標：渲染在 h2 漸層橫條右側，幫助客戶一眼讀懂該區塊用途
const SECTION_HINT = {
  [SECTION.INTRO]: '課程定位與痛點解方',
  [SECTION.TOOLS]: '課程中實際操作的工具',
  [SECTION.OUTCOME]: '上完課能帶走的具體能力',
  [SECTION.AUDIENCE]: '這門課為誰量身設計',
  [SECTION.TOC]: '整體課程結構一覽',
  [SECTION.SYLLABUS]: '章節細節與教學重點',
};

const TRUTHY = /^(true|yes|1|on)$/i;
const isTruthy = (v) => v === true || (typeof v === 'string' && TRUTHY.test(v.trim()));

// 品牌 icon（內嵌 SVG，fill 跟隨連結文字色）。key 為小寫的連結標籤。
const BRAND_ICONS = {
  medium: '<svg class="link-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>',
  youtube: '<svg class="link-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  github: '<svg class="link-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
};

// ─── HTML escape ───

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Minimal YAML parser（足以處理 frontmatter 與 config.yaml）───

function parseScalar(s) {
  s = (s ?? '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// 去掉行末註解（# 前須為空白或行首；引號內的 # 不算註解）
function stripComment(s) {
  let inS = false, inD = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && !inS) inD = !inD;
    else if (c === "'" && !inD) inS = !inS;
    else if (c === '#' && !inS && !inD && (i === 0 || /\s/.test(s[i - 1]))) {
      return s.slice(0, i);
    }
  }
  return s;
}

function parseYaml(text) {
  const lines = text.split('\n');
  let idx = 0;
  const indentOf = (l) => l.match(/^(\s*)/)[1].length;

  function block(minIndent) {
    let result = null;
    while (idx < lines.length) {
      const raw = lines[idx];
      if (raw.trim() === '' || raw.trim().startsWith('#')) { idx++; continue; }
      const ind = indentOf(raw);
      if (ind < minIndent) break;
      const content = raw.slice(ind);

      // list item
      if (content.startsWith('- ')) {
        if (result === null) result = [];
        if (!Array.isArray(result)) break;
        result.push(parseScalar(stripComment(content.slice(2))));
        idx++;
        continue;
      }

      // map entry
      const m = content.match(/^([^:]+):\s*(.*)$/);
      if (!m) { idx++; continue; }
      if (Array.isArray(result)) break;
      if (result === null) result = {};
      const key = m[1].trim();
      const rest = stripComment(m[2]).trimEnd();
      idx++;

      if (rest === '>' || rest === '|') {
        const buf = [];
        while (idx < lines.length) {
          const bl = lines[idx];
          if (bl.trim() !== '' && indentOf(bl) <= ind) break;
          buf.push(bl.trim());
          idx++;
        }
        result[key] = rest === '>'
          ? buf.join(' ').replace(/\s+/g, ' ').trim()
          : buf.join('\n').trim();
      } else if (rest === '') {
        const child = block(ind + 1);
        result[key] = child === null ? '' : child;
      } else {
        result[key] = parseScalar(rest);
      }
    }
    return result;
  }

  return block(0) || {};
}

// ─── Frontmatter ───

function splitFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (m) return { meta: parseYaml(m[1]), body: m[2] };
  return { meta: {}, body: md };
}

// ─── 往上層尋找 config.yaml ───

function findConfig(startDir) {
  let dir = resolve(startDir);
  for (let i = 0; i < 8; i++) {
    const p = join(dir, 'config.yaml');
    if (existsSync(p)) return p;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// ─── Markdown → HTML ───

function renderInline(text) {
  let s = esc(text);
  // 超連結 [文字](網址)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  // 行內程式碼 `code`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // 粗體 **text**（須在斜體之前處理）
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 斜體 *text*
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  // 斜體 _text_（避開 snake_case）
  s = s.replace(/(?<![\w*])_([^_\n]+)_(?![\w*])/g, '<em>$1</em>');
  return s;
}

/**
 * 區塊感知渲染：因提案版型為固定六大區塊，依目前 h2 區塊名稱
 * 給予專屬排版 —— 使用工具→標籤列、預計成效/適合對象→勾選列、
 * 課程目錄→編號清單、課程大綱的每個 ### →包成 .chapter（整章不跨頁）。
 */
function renderMarkdown(md) {
  md = md.replace(/<!--[\s\S]*?-->/g, '');
  const lines = md.split('\n');
  const out = [];
  const para = [];
  const listStack = [];   // { tag, indent }
  let h2Count = 0;
  let section = '';        // 目前 h2 區塊名稱
  let chapterOpen = false; // 是否在 .chapter 內
  let listClass = '';      // 目前最外層 list 的 class

  const closeAllLists = () => { while (listStack.length) out.push(`</li></${listStack.pop().tag}>`); };
  const closeChapter = () => { if (chapterOpen) { out.push('</section>'); chapterOpen = false; } };
  const flushPara = () => {
    if (!para.length) return;
    const cls = section === SECTION.INTRO ? ' class="lead"' : '';
    out.push(`<p${cls}>${renderInline(para.join(' '))}</p>`);
    para.length = 0;
  };

  // 依區塊把 li 內文做專屬處理（使用工具切成「標籤 + 說明」）
  const liContent = (text) => {
    if (listClass === 'tool-list') {
      const m = text.match(/^(.+?)\s*—\s*(.+)$/);
      if (m) {
        return `<span class="tool-tag">${renderInline(m[1])}</span>` +
               `<span class="tool-desc">${renderInline(m[2])}</span>`;
      }
    }
    return renderInline(text);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    if (t === '') { flushPara(); continue; }

    const h = t.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      flushPara(); closeAllLists();
      const level = h[1].length;
      const text = h[2].trim();
      if (level === 2) {
        closeChapter();
        section = text;
        // 區塊感知：空區塊（標題後沒有任何內容）整段略過，不渲染也不編號
        let hasContent = false;
        for (let k = i + 1; k < lines.length; k++) {
          const lt = lines[k].trim();
          if (/^#{1,2}\s/.test(lt)) break;
          if (lt !== '') { hasContent = true; break; }
        }
        if (!hasContent) continue;
        h2Count++;
        const hint = SECTION_HINT[text];
        const hintHtml = hint ? `<span class="h2-hint">${esc(hint)}</span>` : '';
        out.push(
          `<h2><span class="h2-num">${h2Count}</span>` +
          `<span class="h2-text">${renderInline(text)}</span>${hintHtml}</h2>`
        );
      } else if (level === 3) {
        closeChapter();
        out.push(`<section class="chapter"><h3>${renderInline(text)}</h3>`);
        chapterOpen = true;
      } else {
        out.push(`<h${level}>${renderInline(text)}</h${level}>`);
      }
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flushPara(); closeAllLists(); out.push('<hr>'); continue; }

    // 場次分隔帶  === 標題 ===（多場次課程；模組仍用 ###）
    const sess = t.match(/^={3,}\s+(.+?)\s+={3,}$/);
    if (sess) {
      flushPara(); closeAllLists(); closeChapter();
      out.push(`<div class="session-band">${renderInline(sess[1])}</div>`);
      continue;
    }

    // GFM table
    const next = lines[i + 1] || '';
    if (t.startsWith('|') && next.includes('-') && next.includes('|') && /^[\s|:-]+$/.test(next.trim())) {
      flushPara(); closeAllLists();
      const cells = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const head = cells(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i])); i++; }
      i--;
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${renderInline(c)}</th>`).join('')}</tr></thead>` +
        `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      );
      continue;
    }

    // list item
    const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.+)$/);
    if (li) {
      flushPara();
      const indent = li[1].length;
      const tag = /^\d/.test(li[2]) ? 'ol' : 'ul';
      while (listStack.length && listStack[listStack.length - 1].indent > indent) {
        out.push(`</li></${listStack.pop().tag}>`);
      }
      const top = listStack[listStack.length - 1];
      if (top && top.indent === indent) {
        if (top.tag === tag) {
          out.push('</li><li>');
        } else {
          out.push(`</li></${listStack.pop().tag}>`);
          out.push(`<${tag}><li>`);
          listStack.push({ tag, indent });
        }
      } else {
        if (listStack.length === 0) {
          // 開最外層清單 —— 依目前區塊決定 class
          listClass =
            section === SECTION.TOOLS ? 'tool-list'
            : (section === SECTION.OUTCOME || section === SECTION.AUDIENCE) ? 'check-list'
            : section === SECTION.TOC ? 'toc-list'
            : '';
        }
        const cls = listStack.length === 0 && listClass ? ` class="${listClass}"` : '';
        out.push(`<${tag}${cls}><li>`);
        listStack.push({ tag, indent });
      }
      out.push(liContent(li[3]));
      continue;
    }

    if (t.startsWith('>')) {
      flushPara(); closeAllLists();
      out.push(`<blockquote>${renderInline(t.replace(/^>\s?/, ''))}</blockquote>`);
      continue;
    }

    if (listStack.length) out.push(' ' + liContent(t));
    else para.push(t);
  }

  flushPara();
  closeAllLists();
  closeChapter();
  return out.join('\n');
}

// ─── HTML 組裝 ───

// 從 README body 抽出「課程簡介」段落前兩個句號作為封面副述（約 80–140 字）
function extractTagline(body) {
  if (!body) return '';
  const m = body.match(/##\s+課程簡介\s*\n([\s\S]*?)(?=\n##\s|$)/);
  if (!m) return '';
  const text = m[1]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const sentences = text.split('。').map((s) => s.trim()).filter(Boolean);
  if (!sentences.length) return text.slice(0, 120);
  const picked = sentences.slice(0, 2).join('。') + '。';
  return picked.length > 160 ? sentences[0] + '。' : picked;
}

function renderCover(meta, cfg, client, body) {
  const ins = cfg.instructor || {};
  const courseTitle = esc(meta.course_title || '');
  const tagline = extractTagline(body);
  const items = [
    meta.duration ? { label: '課程時數', value: meta.duration } : null,
    meta.date ? { label: '提案日期', value: meta.date } : null,
    ins.name ? { label: '講師', value: ins.name } : null,
  ].filter(Boolean);
  const metaCells = items.map((it) =>
    `<div class="cover-meta-cell">` +
    `<div class="cover-meta-label">${esc(it.label)}</div>` +
    `<div class="cover-meta-value">${esc(it.value)}</div>` +
    `</div>`
  ).join('');
  return `
  <section class="cover-page">
    <div class="cover">
      <div class="cover-kicker">企業內訓提案</div>
      <div class="cover-main">
        <h1 class="cover-client">${esc(client)}</h1>
        ${courseTitle ? `<div class="cover-line"></div><h2 class="cover-course">${courseTitle}</h2>` : ''}
        ${tagline ? `<p class="cover-tagline">${esc(tagline)}</p>` : ''}
      </div>
      ${metaCells ? `<div class="cover-meta-row">${metaCells}</div>` : ''}
    </div>
  </section>`;
}

function buildHtml(meta, body, bodyHtml, cfg, client, themeCss, useCover) {
  const accent = (cfg.brand && cfg.brand.accent) || '#2563EB';
  const ins = cfg.instructor;
  const title = esc(meta.course_title || client);
  const metaLine = [client, ins && ins.name, meta.duration, meta.date]
    .filter(Boolean).map(esc).join(' · ');

  let instructorHtml = '';
  if (ins) {
    const highlights = Array.isArray(ins.highlights)
      ? `<ul class="ins-highlights">${ins.highlights.map((x) => `<li>${renderInline(x)}</li>`).join('')}</ul>`
      : '';
    const links = Array.isArray(ins.links)
      ? `<p class="ins-links">${ins.links.map((l) => {
          const parts = String(l).split('｜');
          if (parts.length !== 2) return esc(l);
          const label = parts[0].trim();
          const icon = BRAND_ICONS[label.toLowerCase()] || '';
          return `<a href="${esc(parts[1].trim())}">${icon}${esc(label)}</a>`;
        }).join('　·　')}</p>`
      : '';
    instructorHtml = `
  <section class="instructor">
    <div class="ins-label">關於講師</div>
    <p class="ins-name">${esc(ins.name || '')}${ins.tagline ? `<span>${esc(ins.tagline)}</span>` : ''}</p>
    ${ins.bio ? `<p class="ins-bio">${esc(ins.bio)}</p>` : ''}
    ${highlights}
    ${links}
  </section>`;
  }

  const coverHtml = useCover ? renderCover(meta, cfg, client, body) : '';
  const docHeadHtml = useCover ? '' : `
  <header class="doc-head">
    <div class="kicker">課程提案</div>
    <div class="doc-title">${title}</div>
    ${metaLine ? `<div class="doc-meta">${metaLine}</div>` : ''}
  </header>`;

  // 兩種模式共用 puppeteer 標準 margin（16/18/16/16）以確保內頁邊距穩定；
  // 封面靠負 margin 撐到頁面物理邊緣，底部 18mm 是 footer 區（顯示頁碼）。
  const inner = useCover
    ? `${coverHtml}<main>${bodyHtml}</main>${instructorHtml}`
    : `${docHeadHtml}<main>${bodyHtml}</main>${instructorHtml}`;

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
:root { --accent: ${accent}; }
${themeCss}
</style>
</head>
<body class="${useCover ? 'has-cover' : 'no-cover'}">${inner}
</body>
</html>`;
}

// ─── 主流程 ───

function printUsage() {
  console.log(`
Proposal PDF Builder

用法：
  node .agents/skills/proposal-writer/scripts/build-pdf.mjs <proposal-dir> [--cover|--no-cover]

旗標：
  --cover      強制啟用封面頁（覆寫 frontmatter）
  --no-cover   強制關閉封面頁（覆寫 frontmatter）
  （不指定時依 frontmatter cover 欄位，預設不啟用）

範例：
  node .agents/skills/proposal-writer/scripts/build-pdf.mjs proposal/todo/睿華國際
  node .agents/skills/proposal-writer/scripts/build-pdf.mjs proposal/todo/睿華國際 --cover

讀取 <proposal-dir>/README.md 與祖目錄的 config.yaml，
套用 references/theme.css，輸出 <proposal-dir>/<客戶名稱>-提案.pdf
`);
}

async function main() {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith('--'));
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const arg = positional[0];
  if (!arg || flags.has('--help') || flags.has('-h')) {
    printUsage();
    process.exit(arg ? 0 : 1);
  }
  const coverFlag = flags.has('--cover') ? true
    : flags.has('--no-cover') ? false
    : null;

  const proposalDir = resolve(arg);
  const readmePath = join(proposalDir, 'README.md');
  if (!existsSync(readmePath)) {
    console.error(`✗ 找不到 ${readmePath}`);
    process.exit(1);
  }

  const { meta, body } = splitFrontmatter(readFileSync(readmePath, 'utf-8'));
  const client = (meta.client && String(meta.client).trim()) || basename(proposalDir);

  const cfgPath = findConfig(proposalDir);
  let cfg = {};
  if (cfgPath) {
    cfg = parseYaml(readFileSync(cfgPath, 'utf-8'));
    console.log(`· config：${cfgPath}`);
  } else {
    console.warn('⚠ 找不到 config.yaml，將略過「關於講師」區塊');
  }

  const useCover = coverFlag !== null ? coverFlag : isTruthy(meta.cover);
  const themeCss = readFileSync(THEME_CSS, 'utf-8');
  const html = buildHtml(meta, body, renderMarkdown(body), cfg, client, themeCss, useCover);

  // 用舊版 headless（chrome-headless-shell）：新版 headless 的 page.pdf()
  // 對嵌入的 CJK 字型子集有渲染問題，會導致內文文字空白。
  const browser = await puppeteer.launch({ headless: 'shell' });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const outPath = join(proposalDir, `${client}-提案.pdf`);
    const footerTpl =
      `<div style="width:100%;font-size:8px;color:#9ca3af;` +
      `padding:0 16mm;display:flex;justify-content:space-between;">` +
      `<span>${esc(cfg.footer || '')}</span>` +
      `<span><span class="pageNumber"></span> / <span class="totalPages"></span></span>` +
      `</div>`;
    // useCover 時不傳 puppeteer margin，讓 theme.css 的 @page 規則接手：
    //   @page :first  → margin: 0     （封面真正滿版到 A4 物理四邊）
    //   @page         → margin: 16mm…  （內頁；分頁時每頁頂部都有邊距）
    // 這比 puppeteer margin: 0 + main padding-top 更正確，因為 main padding
    // 只在第一個內頁的頂部生效，後續分頁的新頁頂部會緊貼物理邊緣。
    // 同時 useCover 時關閉 footer 渲染（避免覆蓋封面），內頁因此也沒有頁碼。
    const pdfOpts = useCover
      ? {
          path: outPath,
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: false,
          preferCSSPageSize: true,
        }
      : {
          path: outPath,
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<span></span>',
          footerTemplate: footerTpl,
          margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' },
        };
    await page.pdf(pdfOpts);
    console.log(`✓ 已產生 PDF：${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
