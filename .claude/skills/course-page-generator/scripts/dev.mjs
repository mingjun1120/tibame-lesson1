#!/usr/bin/env node
/**
 * Course Page Dev Server
 *
 * Usage:
 *   node dev.mjs <course-dir>          # e.g. node dev.mjs cake
 *   node dev.mjs <course-dir> --port 8080
 *
 * Features:
 *   - Watches content.md, config.yaml, global.yaml, base.html for changes
 *   - Auto-rebuilds on save
 *   - Live-reloads browser via SSE
 */

import { createServer } from 'http';
import { readFileSync, existsSync, statSync, watch } from 'fs';
import { resolve, dirname, join, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILD_SCRIPT = resolve(__dirname, 'build.mjs');

// ─── Args ───

const args = process.argv.slice(2);
if (args.length < 1 || args[0] === '--help') {
  console.log('Usage: node dev.mjs <course-dir> [--port 3000]');
  process.exit(1);
}

let courseDir = resolve(args[0]);
if (!statSync(courseDir, { throwIfNoEntry: false })?.isDirectory()) {
  if (args[0].endsWith('.md')) courseDir = dirname(resolve(args[0]));
}

let port = 3000;
const portIdx = args.indexOf('--port');
if (portIdx !== -1 && args[portIdx + 1]) port = parseInt(args[portIdx + 1], 10);

// ─── Build helper ───

function runBuild() {
  try {
    execFileSync(process.execPath, [BUILD_SCRIPT, courseDir], { stdio: 'inherit' });
    return true;
  } catch {
    console.error('⚠️  Build failed, waiting for next save...');
    return false;
  }
}

// ─── SSE clients ───

const sseClients = new Set();

const LIVE_RELOAD_SNIPPET = `
<!-- dev server live reload -->
<script>
(function(){
  var es = new EventSource('/__sse');
  es.onmessage = function(e){ if(e.data==='reload') location.reload(); };
  es.onerror = function(){ setTimeout(function(){ location.reload(); }, 2000); };
})();
</script>
</body>`;

// ─── HTTP server ───

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  // SSE endpoint
  if (url.pathname === '/__sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Serve static files from courseDir
  let filePath = join(courseDir, url.pathname === '/' ? 'index.html' : url.pathname);

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
    if (!existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
  }

  const ext = extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  let content = readFileSync(filePath);

  // Inject live-reload snippet into HTML
  if (ext === '.html') {
    let html = content.toString('utf-8');
    html = html.replace('</body>', LIVE_RELOAD_SNIPPET);
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(html);
    return;
  }

  res.writeHead(200, { 'Content-Type': mime });
  res.end(content);
});

// ─── File watcher ───

function notifyReload() {
  for (const client of sseClients) {
    client.write('data: reload\n\n');
  }
}

let buildTimeout = null;
function scheduleBuild() {
  if (buildTimeout) clearTimeout(buildTimeout);
  buildTimeout = setTimeout(() => {
    console.log(`\n♻️  Change detected, rebuilding...`);
    if (runBuild()) notifyReload();
  }, 200);
}

// Watch course dir (content.md, config.yaml)
const watchPaths = [courseDir];

// Also watch base.html template
const baseHtmlDir = resolve(__dirname, '../reference');
if (existsSync(baseHtmlDir)) watchPaths.push(baseHtmlDir);

// Also watch global config if it exists
// 行為與 build.mjs 對齊：先從課程父層往上找，找不到再 fallback 到 <repo>/course/config
const DEFAULT_GLOBAL_CONFIG_DIR = process.env.COURSE_GLOBAL_CONFIG
  ? dirname(resolve(process.env.COURSE_GLOBAL_CONFIG))
  : resolve(process.cwd(), 'course/config');

function findGlobalConfigDir() {
  let dir = dirname(courseDir);
  for (let i = 0; i < 4; i++) {
    const candidate = join(dir, 'config');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (existsSync(DEFAULT_GLOBAL_CONFIG_DIR)) return DEFAULT_GLOBAL_CONFIG_DIR;
  return null;
}
const globalConfigDir = findGlobalConfigDir();
if (globalConfigDir) watchPaths.push(globalConfigDir);

const WATCH_EXTS = new Set(['.md', '.yaml', '.yml', '.html']);
const IGNORE_FILES = new Set(['index.html']);

for (const dir of watchPaths) {
  try {
    watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const base = filename.split('/').pop().split('\\').pop();
      if (IGNORE_FILES.has(base)) return;
      const ext = extname(filename).toLowerCase();
      if (WATCH_EXTS.has(ext)) scheduleBuild();
    });
  } catch (e) {
    console.warn(`⚠️  Cannot watch ${dir}: ${e.message}`);
  }
}

// ─── Start ───

console.log(`\n🚀 Course Dev Server`);
console.log(`   Course: ${courseDir}`);
console.log(`   Watching: ${watchPaths.map(p => relative(process.cwd(), p) || '.').join(', ')}`);

// Initial build
runBuild();

const origPort = port;
function tryListen(p) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`   ⚠️  Port ${p} in use, trying ${p + 1}…`);
      tryListen(p + 1);
    } else {
      throw err;
    }
  });
  server.listen(p, () => {
    port = p;
    if (p !== origPort) {
      console.log(`\n   ✅ Port ${origPort} was in use → using port ${port} instead`);
    }
    console.log(`\n   🌐 http://localhost:${port}\n`);
  });
}
tryListen(port);
