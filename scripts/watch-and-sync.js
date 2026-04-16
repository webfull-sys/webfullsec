#!/usr/bin/env node
/**
 * ============================================
 * WebfullSec — Watch & Sync Local
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 * Script que roda NO SEU PC (não na VPS).
 * Monitora as pastas LocalWP e ProjetosWebfull e
 * envia os dados automaticamente para o WebfullSec na VPS.
 *
 * COMO USAR:
 *   node scripts/watch-and-sync.js
 *
 * COMO INICIAR AUTOMATICAMENTE COM O WINDOWS:
 *   - Crie um atalho deste script na pasta de Inicialização do Windows:
 *     %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
 *   - Ou use o Task Scheduler do Windows para rodar na inicialização
 * ============================================
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// =============================================
// CONFIGURAÇÃO
// =============================================
const CONFIG = {
  // URL da API do WebfullSec na VPS (em produção) ou local (em dev)
  WEBFULLSEC_URL: process.env.WEBFULLSEC_URL || 'https://webfullsec.webfullvps.com.br',

  // Chave de API para autenticar as chamadas
  API_KEY: process.env.WEBHOOK_API_KEY || process.env.N8N_API_KEY || 'dev-webhook-key',

  // Pastas a monitorar
  LOCALWP_PATH: process.env.LOCALWP_BASE_PATH || 'C:\\Users\\LuizFerreira\\Local Sites',
  PROJETOSWEBFULL_PATH: process.env.PROJETOSWEBFULL_BASE_PATH || 'D:\\ProjetosWebfull',

  // Debounce: aguarda N ms antes de enviar para evitar múltiplos envios
  DEBOUNCE_MS: 3000,

  // Intervalo de sincronização completa (em milissegundos) — fallback caso o watch falhe
  FULL_SYNC_INTERVAL_MS: 15 * 60 * 1000, // 15 minutos
};

// =============================================
// UTILITÁRIOS
// =============================================

/**
 * Log com timestamp colorido no terminal.
 */
function log(level, msg) {
  const icons = { info: '💬', ok: '✅', warn: '⚠️', error: '❌', sync: '🔄' };
  const icon = icons[level] || '•';
  console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${icon} ${msg}`);
}

/**
 * Faz uma requisição HTTP/HTTPS para a API do WebfullSec.
 */
function callApi(endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, CONFIG.WEBFULLSEC_URL);
    const data = JSON.stringify(body);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-api-key': CONFIG.API_KEY,
      },
      // Aceitar certificados autoassinados em dev
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    };

    const req = lib.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout na requisição')); });
    req.write(data);
    req.end();
  });
}

// =============================================
// SCANNER: LocalWP
// =============================================

/**
 * Escaneia a pasta do LocalWP e retorna a lista de sites.
 */
function scanLocalWpSites(basePath) {
  if (!fs.existsSync(basePath)) {
    log('warn', `Pasta LocalWP não encontrada: ${basePath}`);
    return [];
  }

  const sites = [];
  const entries = fs.readdirSync(basePath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sitePath = path.join(basePath, entry.name);
    const wpConfigPath = path.join(sitePath, 'app', 'public', 'wp-config.php');

    // Só processa pastas que têm um wp-config.php = site WordPress válido
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
        const themes = fs.readdirSync(themesPath).filter(f =>
          fs.statSync(path.join(themesPath, f)).isDirectory()
        );
        const active = themes.find(t => fs.existsSync(path.join(themesPath, t, 'style.css')));
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
        fs.readdirSync(pluginsPath).forEach(f => {
          if (fs.statSync(path.join(pluginsPath, f)).isDirectory() && !f.startsWith('.')) {
            plugins.push(f);
          }
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

const PROJECT_IGNORES = ['node_modules', '.git', '.next', '.vscode', 'WebfullSec'];

/**
 * Detecta o tipo de projeto com base nos arquivos presentes.
 */
function detectType(projectPath) {
  if (fs.existsSync(path.join(projectPath, 'wp-config.php'))) return 'wordpress';
  if (fs.existsSync(path.join(projectPath, 'next.config.js')) || fs.existsSync(path.join(projectPath, 'next.config.mjs'))) return 'nextjs';
  if (fs.existsSync(path.join(projectPath, 'artisan'))) return 'laravel';
  if (fs.existsSync(path.join(projectPath, 'package.json'))) return 'nodejs';
  if (fs.existsSync(path.join(projectPath, 'composer.json'))) return 'php';
  if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) return 'python';
  if (fs.existsSync(path.join(projectPath, 'go.mod'))) return 'go';
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) return 'rust';
  return 'generic';
}

/**
 * Detecta o tech stack do projeto.
 */
function detectTechStack(projectPath) {
  const stack = [];
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
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

/**
 * Lê o git remote do projeto.
 */
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

/**
 * Escaneia a pasta D:\ProjetosWebfull e retorna a lista de projetos.
 */
function scanProjetosWebfull(basePath) {
  if (!fs.existsSync(basePath)) {
    log('warn', `Pasta ProjetosWebfull não encontrada: ${basePath}`);
    return [];
  }

  const projects = [];
  const entries = fs.readdirSync(basePath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (PROJECT_IGNORES.includes(entry.name) || entry.name.startsWith('.')) continue;

    const projectPath = path.join(basePath, entry.name);

    // Garante que tem conteúdo
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
      fileCount: 0, // Não contamos no watch para performance
    });
  }

  return projects;
}

// =============================================
// SINCRONIZAÇÃO
// =============================================

/**
 * Sincroniza os sites LocalWP com o WebfullSec.
 */
async function syncLocalWp() {
  log('sync', 'Sincronizando LocalWP...');
  const sites = scanLocalWpSites(CONFIG.LOCALWP_PATH);

  if (sites.length === 0) {
    log('warn', 'Nenhum site LocalWP válido encontrado.');
    return;
  }

  try {
    const res = await callApi('/api/localwp/sync', {
      action: 'bulkSync',
      sites,
    });

    if (res.status === 200 && res.data.success) {
      log('ok', `LocalWP sincronizado: ${res.data.created} criados, ${res.data.updated} atualizados.`);
    } else {
      log('error', `Falha ao sincronizar LocalWP: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    log('error', `Erro de rede ao sincronizar LocalWP: ${err.message}`);
  }
}

/**
 * Sincroniza os projetos de D:\ProjetosWebfull com o WebfullSec.
 */
async function syncProjetosWebfull() {
  log('sync', 'Sincronizando ProjetosWebfull...');
  const projects = scanProjetosWebfull(CONFIG.PROJETOSWEBFULL_PATH);

  if (projects.length === 0) {
    log('warn', 'Nenhum projeto ProjetosWebfull encontrado.');
    return;
  }

  try {
    const res = await callApi('/api/projetoswebfull/sync', {
      action: 'bulkSync',
      projects,
    });

    if (res.status === 200 && res.data.success) {
      log('ok', `ProjetosWebfull sincronizado: ${res.data.created} criados, ${res.data.updated} atualizados.`);
    } else {
      log('error', `Falha ao sincronizar ProjetosWebfull: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    log('error', `Erro de rede ao sincronizar ProjetosWebfull: ${err.message}`);
  }
}

/**
 * Executa uma sincronização completa inicial.
 */
async function fullSync() {
  log('sync', '🚀 Iniciando sincronização completa...');
  await syncLocalWp();
  await syncProjetosWebfull();
  log('ok', 'Sincronização completa finalizada.');
}

// =============================================
// WATCH: Monitoramento em tempo real
// =============================================

/** Mapa de timers de debounce para evitar múltiplos disparos */
const debounceTimers = {};

/**
 * Agenda uma sincronização com debounce.
 * @param {string} key - Chave única (ex: 'localwp')
 * @param {function} fn - Função a executar
 */
function scheduleSync(key, fn) {
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(async () => {
    await fn();
  }, CONFIG.DEBOUNCE_MS);
}

/**
 * Inicia o monitoramento de uma pasta.
 */
function watchFolder(folderPath, label, syncFn) {
  if (!fs.existsSync(folderPath)) {
    log('warn', `Pasta não encontrada para monitorar: ${folderPath}`);
    return;
  }

  log('info', `Monitorando ${label}: ${folderPath}`);

  // fs.watch no diretório pai detecta criação/remoção de subpastas
  fs.watch(folderPath, { persistent: true }, (eventType, filename) => {
    if (!filename) return;

    // Ignorar arquivos temporários e pastas do sistema
    if (filename.startsWith('.') || filename === 'node_modules') return;

    log('info', `[${label}] Mudança detectada: ${eventType} → ${filename}`);
    scheduleSync(label, syncFn);
  });
}

// =============================================
// MAIN
// =============================================

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  WebfullSec Watch & Sync — Local Agent ║');
  console.log('║  Webfull (https://webfull.com.br)      ║');
  console.log('╚════════════════════════════════════════╝\n');

  log('info', `VPS URL: ${CONFIG.WEBFULLSEC_URL}`);
  log('info', `LocalWP: ${CONFIG.LOCALWP_PATH}`);
  log('info', `ProjetosWebfull: ${CONFIG.PROJETOSWEBFULL_PATH}`);
  console.log('');

  // 1. Sincronização completa inicial
  await fullSync();

  // 2. Monitoramento em tempo real
  watchFolder(CONFIG.LOCALWP_PATH, 'LocalWP', syncLocalWp);
  watchFolder(CONFIG.PROJETOSWEBFULL_PATH, 'ProjetosWebfull', syncProjetosWebfull);

  // 3. Sincronização periódica de fallback (a cada 15 minutos)
  setInterval(async () => {
    log('sync', '⏰ Sincronização periódica (15 min)...');
    await fullSync();
  }, CONFIG.FULL_SYNC_INTERVAL_MS);

  log('ok', 'Agente local ativo! Aguardando mudanças...\n');
  log('info', 'Pressione Ctrl+C para parar.\n');
}

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  log('error', `Erro não tratado: ${err.message}`);
});

process.on('SIGINT', () => {
  log('info', 'Encerrando agente local...');
  process.exit(0);
});

main().catch(err => {
  log('error', `Erro fatal: ${err.message}`);
  process.exit(1);
});
