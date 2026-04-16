#!/usr/bin/env node
/**
 * ============================================
 * WebfullSec — Watch & Sync Local
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.2.0 — Servidor HTTP local na porta 3099
 * ============================================
 * Script que roda NO SEU PC (não na VPS).
 * Monitora as pastas LocalWP e ProjetosWebfull e
 * envia os dados automaticamente para o WebfullSec na VPS.
 *
 * COMO USAR:
 *   cd D:\ProjetosWebfull\WebfullSec
 *   node scripts/watch-and-sync.js
 *
 * COMO INICIAR AUTOMATICAMENTE COM O WINDOWS:
 *   Crie um arquivo .bat com o conteúdo abaixo e coloque na pasta de Inicialização:
 *   %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
 *
 *   start_sync.bat:
 *   @echo off
 *   node D:\ProjetosWebfull\WebfullSec\scripts\watch-and-sync.js
 * ============================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// =============================================
// CONFIGURAÇÃO
// =============================================
const CONFIG = {
  // URL da API do WebfullSec na VPS
  WEBFULLSEC_URL: process.env.WEBFULLSEC_URL || 'https://webfullsec.webfullvps.com.br',

  // Chave de API para autenticar as chamadas
  API_KEY: process.env.WEBHOOK_API_KEY || process.env.N8N_API_KEY || 'dev-webhook-key',

  // Pastas a monitorar
  LOCALWP_PATH: process.env.LOCALWP_BASE_PATH || 'C:\\Users\\LuizFerreira\\Local Sites',
  PROJETOSWEBFULL_PATH: process.env.PROJETOSWEBFULL_BASE_PATH || 'D:\\ProjetosWebfull',

  // Pastas a ignorar em ProjetosWebfull
  IGNORE_FOLDERS: ['WebfullSec', 'node_modules', '.git', '.next', '.vscode'],

  // Debounce: aguarda N ms antes de enviar (evita múltiplos disparos)
  DEBOUNCE_MS: 3000,

  // Intervalo de sincronização completa de fallback (15 minutos)
  FULL_SYNC_INTERVAL_MS: 15 * 60 * 1000,

  // Porta do servidor HTTP local (usado pelo browser para escanear pastas do PC)
  LOCAL_PORT: parseInt(process.env.LOCAL_SYNC_PORT || '3099'),
};

// =============================================
// UTILITÁRIOS
// =============================================

/** Log com timestamp colorido */
function log(level, msg) {
  const icons = { info: '💬', ok: '✅', warn: '⚠️ ', error: '❌', sync: '🔄' };
  const icon = icons[level] || '•';
  const time = new Date().toLocaleTimeString('pt-BR');
  console.log(`[${time}] ${icon} ${msg}`);
}

/** Faz POST para a API do WebfullSec */
function callApi(endpoint, body) {
  return new Promise((resolve, reject) => {
    try {
      const baseUrl = CONFIG.WEBFULLSEC_URL.replace(/\/$/, '');
      const fullUrl = `${baseUrl}${endpoint}`;
      const url = new URL(fullUrl);
      const data = JSON.stringify(body);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port ? parseInt(url.port) : (isHttps ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'x-api-key': CONFIG.API_KEY,
        },
        // Aceitar certificados durante desenvolvimento
        rejectUnauthorized: false,
        timeout: 30000,
      };

      const req = lib.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(responseData) });
          } catch {
            resolve({ status: res.statusCode, data: responseData });
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout na requisição'));
      });

      req.write(data);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// =============================================
// SCANNER: LocalWP
// =============================================

/** Escaneia a pasta do LocalWP e retorna a lista de sites WordPress válidos */
function scanLocalWpSites(basePath) {
  if (!fs.existsSync(basePath)) {
    log('warn', `Pasta LocalWP não encontrada: ${basePath}`);
    return [];
  }

  const sites = [];

  let entries;
  try {
    entries = fs.readdirSync(basePath, { withFileTypes: true });
  } catch (err) {
    log('error', `Erro ao ler pasta LocalWP: ${err.message}`);
    return [];
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sitePath = path.join(basePath, entry.name);
    const wpConfigPath = path.join(sitePath, 'app', 'public', 'wp-config.php');

    if (!fs.existsSync(wpConfigPath)) continue;

    const publicPath = path.join(sitePath, 'app', 'public');
    let wpVersion = null;
    let themeName = null;
    const plugins = [];

    // Versão do WordPress
    try {
      const versionPath = path.join(publicPath, 'wp-includes', 'version.php');
      if (fs.existsSync(versionPath)) {
        const content = fs.readFileSync(versionPath, 'utf-8');
        const match = content.match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);
        if (match) wpVersion = match[1];
      }
    } catch {}

    // Tema ativo
    try {
      const themesPath = path.join(publicPath, 'wp-content', 'themes');
      if (fs.existsSync(themesPath)) {
        const themes = fs.readdirSync(themesPath).filter((f) => {
          try {
            return fs.statSync(path.join(themesPath, f)).isDirectory();
          } catch {
            return false;
          }
        });
        const active = themes.find((t) =>
          fs.existsSync(path.join(themesPath, t, 'style.css'))
        );
        if (active) {
          const css = fs.readFileSync(path.join(themesPath, active, 'style.css'), 'utf-8');
          const match = css.match(/Theme Name:\s*([^\n]+)/);
          themeName = match ? match[1].trim() : active;
        }
      }
    } catch {}

    // Plugins
    try {
      const pluginsPath = path.join(publicPath, 'wp-content', 'plugins');
      if (fs.existsSync(pluginsPath)) {
        fs.readdirSync(pluginsPath).forEach((f) => {
          try {
            if (
              fs.statSync(path.join(pluginsPath, f)).isDirectory() &&
              !f.startsWith('.')
            ) {
              plugins.push(f);
            }
          } catch {}
        });
      }
    } catch {}

    sites.push({
      name: entry.name,
      path: sitePath,
      domain: `${entry.name}.local`,
      wpVersion,
      themeName,
      plugins,
      dbType: 'Unknown',
    });
  }

  return sites;
}

// =============================================
// SCANNER: ProjetosWebfull
// =============================================

/** Detecta o tipo do projeto pelo conteúdo da pasta */
function detectType(projectPath) {
  if (fs.existsSync(path.join(projectPath, 'wp-config.php'))) return 'wordpress';
  if (
    fs.existsSync(path.join(projectPath, 'next.config.js')) ||
    fs.existsSync(path.join(projectPath, 'next.config.mjs')) ||
    fs.existsSync(path.join(projectPath, 'next.config.ts'))
  )
    return 'nextjs';
  if (fs.existsSync(path.join(projectPath, 'artisan'))) return 'laravel';
  if (fs.existsSync(path.join(projectPath, 'package.json'))) return 'nodejs';
  if (fs.existsSync(path.join(projectPath, 'composer.json'))) return 'php';
  if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) return 'python';
  if (fs.existsSync(path.join(projectPath, 'go.mod'))) return 'go';
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) return 'rust';
  return 'generic';
}

/** Detecta as tecnologias usadas */
function detectTechStack(projectPath) {
  const stack = [];
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
      stack.push('Node.js');
      if (deps.next) stack.push('Next.js');
      if (deps.react) stack.push('React');
      if (deps.express) stack.push('Express');
      if (deps['@prisma/client'] || deps.prisma) stack.push('Prisma');
      if (deps.tailwindcss) stack.push('TailwindCSS');
    }
  } catch {}
  if (fs.existsSync(path.join(projectPath, 'wp-config.php'))) stack.push('WordPress');
  if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) stack.push('Python');
  if (fs.existsSync(path.join(projectPath, 'go.mod'))) stack.push('Go');
  return [...new Set(stack)];
}

/** Lê a URL do repositório Git */
function getGitRemote(projectPath) {
  try {
    const configPath = path.join(projectPath, '.git', 'config');
    if (!fs.existsSync(configPath)) return null;
    const content = fs.readFileSync(configPath, 'utf-8');
    const match = content.match(/url\s*=\s*(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// =============================================
// SCANNER: Qualquer pasta do PC (para o modal do browser)
// =============================================

/**
 * Escaneia QUALQUER pasta do PC e retorna metadados.
 * Usado pelo servidor HTTP local para responder ao browser.
 */
function scanFolderAny(folderPath) {
  if (!fs.existsSync(folderPath)) {
    return { error: `Caminho não encontrado: ${folderPath}` };
  }

  const stat = fs.statSync(folderPath);
  if (!stat.isDirectory()) {
    return { error: 'O caminho informado não é uma pasta.' };
  }

  const projectName = path.basename(folderPath);
  const type = detectType(folderPath);
  const techStack = detectTechStack(folderPath);
  const gitRepo = getGitRemote(folderPath);

  // Ícone por tipo
  const icons = { wordpress: '🟦', nextjs: '⚛️', react: '⚛️', nodejs: '🟢', laravel: '🦁', php: '🐘', python: '🐍', go: '🔵', rust: '🦀', generic: '📁' };
  const icon = icons[type] || '📁';

  // Contagem rápida de arquivos (2 níveis apenas)
  let fileCount = 0;
  try {
    const walk = (dir, depth) => {
      if (depth > 2) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '.next') continue;
        if (e.isFile()) fileCount++;
        else if (e.isDirectory()) walk(path.join(dir, e.name), depth + 1);
      }
    };
    walk(folderPath, 0);
  } catch {}

  // Tema WordPress
  let themeName = null;
  if (type === 'wordpress') {
    try {
      const themesPath = path.join(folderPath, 'wp-content', 'themes');
      if (fs.existsSync(themesPath)) {
        const themes = fs.readdirSync(themesPath).filter(f => {
          try { return fs.statSync(path.join(themesPath, f)).isDirectory(); } catch { return false; }
        });
        const active = themes.find(t => fs.existsSync(path.join(themesPath, t, 'style.css')));
        if (active) {
          const css = fs.readFileSync(path.join(themesPath, active, 'style.css'), 'utf-8');
          const m = css.match(/Theme Name:\s*([^\n]+)/);
          themeName = m ? m[1].trim() : active;
        }
      }
    } catch {}
  }

  return {
    name: projectName,
    path: folderPath,
    type,
    icon,
    techStack,
    gitRepo,
    fileCount,
    themeName,
  };
}

/** Escaneia a pasta D:\ProjetosWebfull */
function scanProjetosWebfull(basePath) {
  if (!fs.existsSync(basePath)) {
    log('warn', `Pasta ProjetosWebfull não encontrada: ${basePath}`);
    return [];
  }

  const projects = [];
  let entries;
  try {
    entries = fs.readdirSync(basePath, { withFileTypes: true });
  } catch (err) {
    log('error', `Erro ao ler pasta ProjetosWebfull: ${err.message}`);
    return [];
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (CONFIG.IGNORE_FOLDERS.includes(entry.name) || entry.name.startsWith('.')) continue;

    const projectPath = path.join(basePath, entry.name);

    try {
      const children = fs.readdirSync(projectPath);
      if (children.length === 0) continue;
    } catch {
      continue;
    }

    projects.push({
      name: entry.name,
      path: projectPath,
      type: detectType(projectPath),
      techStack: detectTechStack(projectPath),
      gitRepo: getGitRemote(projectPath),
      fileCount: 0,
    });
  }

  return projects;
}

// =============================================
// SINCRONIZAÇÃO
// =============================================

/** Sincroniza todos os sites LocalWP com o WebfullSec */
async function syncLocalWp() {
  log('sync', 'Sincronizando LocalWP...');
  const sites = scanLocalWpSites(CONFIG.LOCALWP_PATH);

  if (sites.length === 0) {
    log('warn', 'Nenhum site LocalWP válido encontrado.');
    return;
  }

  log('info', `${sites.length} site(s) LocalWP encontrados: ${sites.map((s) => s.name).join(', ')}`);

  try {
    const res = await callApi('/api/localwp/sync', { action: 'bulkSync', sites });
    if (res.status === 200 && res.data && res.data.success) {
      log('ok', `LocalWP sincronizado: ${res.data.created || 0} criado(s), ${res.data.updated || 0} atualizado(s).`);
    } else {
      log('error', `Resposta inesperada do servidor: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    log('error', `Erro ao sincronizar LocalWP: ${err.message}`);
  }
}

/** Sincroniza todos os projetos de D:\ProjetosWebfull com o WebfullSec */
async function syncProjetosWebfull() {
  log('sync', 'Sincronizando ProjetosWebfull...');
  const projects = scanProjetosWebfull(CONFIG.PROJETOSWEBFULL_PATH);

  if (projects.length === 0) {
    log('warn', 'Nenhum projeto ProjetosWebfull encontrado.');
    return;
  }

  log('info', `${projects.length} projeto(s) encontrado(s): ${projects.map((p) => p.name).join(', ')}`);

  try {
    const res = await callApi('/api/projetoswebfull/sync', { action: 'bulkSync', projects });
    if (res.status === 200 && res.data && res.data.success) {
      log('ok', `ProjetosWebfull sincronizado: ${res.data.created || 0} criado(s), ${res.data.updated || 0} atualizado(s).`);
    } else {
      log('error', `Resposta inesperada do servidor: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    log('error', `Erro ao sincronizar ProjetosWebfull: ${err.message}`);
  }
}

/** Executa a sincronização completa de tudo */
async function fullSync() {
  log('sync', '🚀 Iniciando sincronização completa...');
  await syncLocalWp();
  await syncProjetosWebfull();
  log('ok', 'Sincronização completa finalizada.\n');
}

// =============================================
// WATCH: Monitoramento em tempo real
// =============================================

const debounceTimers = {};

/** Agenda sync com debounce para evitar disparos repetidos */
function scheduleSync(key, fn) {
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(() => {
    fn();
  }, CONFIG.DEBOUNCE_MS);
}

/** Inicia o monitoramento de uma pasta */
function watchFolder(folderPath, label, syncFn) {
  if (!fs.existsSync(folderPath)) {
    log('warn', `Pasta não encontrada para monitorar: ${folderPath} (será monitorada quando criada)`);
    return;
  }

  log('info', `Monitorando ${label}: ${folderPath}`);

  try {
    fs.watch(folderPath, { persistent: true }, (eventType, filename) => {
      if (!filename) return;
      if (filename.startsWith('.') || filename === 'node_modules') return;
      log('info', `[${label}] ${eventType} detectado → ${filename}`);
      scheduleSync(label, syncFn);
    });
  } catch (err) {
    log('error', `Erro ao monitorar ${label}: ${err.message}`);
  }
}

// =============================================
// SERVIDOR HTTP LOCAL (para o browser acessar pastas do PC)
// =============================================

/**
 * Adiciona cabeçalhos CORS à resposta HTTP.
 * Necessário para o browser poder chamar localhost a partir de qualquer origem.
 */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Content-Type', 'application/json');
}

/**
 * Inicia um servidor HTTP local na porta CONFIG.LOCAL_PORT.
 * Endpoints disponíveis:
 * - GET  /ping          → health check
 * - GET  /status        → informações do agente
 * - POST /scan-folder   → escaneia uma pasta e retorna metadados
 */
function startLocalServer() {
  const server = http.createServer((req, res) => {
    setCors(res);

    // Responde a preflight CORS
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url.split('?')[0];

    // GET /ping — Verifica se o agente está rodando
    if (req.method === 'GET' && url === '/ping') {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, message: 'Agente WebfullSec ativo!', version: '2.2.0' }));
      return;
    }

    // GET /status — Informações do agente
    if (req.method === 'GET' && url === '/status') {
      res.writeHead(200);
      res.end(JSON.stringify({
        ok: true,
        localwp: CONFIG.LOCALWP_PATH,
        projetoswebfull: CONFIG.PROJETOSWEBFULL_PATH,
        vps: CONFIG.WEBFULLSEC_URL,
        port: CONFIG.LOCAL_PORT,
      }));
      return;
    }

    // POST /scan-folder — Escaneia qualquer pasta do PC
    if (req.method === 'POST' && url === '/scan-folder') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { folderPath } = JSON.parse(body);
          if (!folderPath) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Informe folderPath no body.' }));
            return;
          }
          const result = scanFolderAny(folderPath.trim());
          if (result.error) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: result.error }));
            return;
          }
          log('ok', `[Servidor Local] Pasta escaneada: ${folderPath}`);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, detected: result }));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Rota não encontrada
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Endpoint não encontrado.' }));
  });

  server.listen(CONFIG.LOCAL_PORT, '127.0.0.1', () => {
    log('ok', `Servidor local ativo em http://localhost:${CONFIG.LOCAL_PORT}`);
    log('info', `  → /ping          Verificar agente`);
    log('info', `  → /scan-folder   Escanear qualquer pasta do PC`);
    console.log('');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log('warn', `Porta ${CONFIG.LOCAL_PORT} já em uso. Agente já pode estar rodando.`);
    } else {
      log('error', `Erro no servidor local: ${err.message}`);
    }
  });

  return server;
}

// =============================================
// MAIN
// =============================================

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  WebfullSec Watch & Sync — Agente Local  ║');
  console.log('║  Webfull (https://webfull.com.br)        ║');
  console.log('╚══════════════════════════════════════════╝\n');

  log('info', `VPS Target: ${CONFIG.WEBFULLSEC_URL}`);
  log('info', `LocalWP:    ${CONFIG.LOCALWP_PATH}`);
  log('info', `Projetos:   ${CONFIG.PROJETOSWEBFULL_PATH}`);
  log('info', `Porta local: ${CONFIG.LOCAL_PORT}`);
  console.log('');

  // 1. Inicia o servidor HTTP local (para o browser usar)
  startLocalServer();

  // 2. Sincronização completa ao iniciar
  await fullSync();

  // 3. Monitoramento em tempo real
  watchFolder(CONFIG.LOCALWP_PATH, 'LocalWP', syncLocalWp);
  watchFolder(CONFIG.PROJETOSWEBFULL_PATH, 'ProjetosWebfull', syncProjetosWebfull);

  // 4. Sync periódico de fallback a cada 15 minutos
  setInterval(() => {
    log('sync', '⏰ Sync periódico de 15 minutos...');
    fullSync();
  }, CONFIG.FULL_SYNC_INTERVAL_MS);

  log('ok', 'Agente ativo! Monitorando mudanças...');
  log('info', 'Pressione Ctrl+C para parar.\n');
}

// Tratamento de erros
process.on('uncaughtException', (err) => {
  log('error', `Erro não tratado: ${err.message}`);
});

process.on('SIGINT', () => {
  console.log('');
  log('info', 'Encerrando agente local...');
  process.exit(0);
});

main().catch((err) => {
  log('error', `Erro fatal: ${err.message}`);
  process.exit(1);
});
