/**
 * ============================================
 * WebfullSec — ProjetosWebfull Scanner
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0 — Aceita qualquer pasta como projeto genérico
 * ============================================
 * Escaneia projetos em D:\ProjetosWebfull:
 * - Detecta projetos (Node, PHP, WordPress, Next.js, etc)
 * - Extrai metadados (tipo, tech stack, package.json)
 * - Toda pasta com arquivos é aceita como projeto genérico
 */

import fs from 'fs';
import path from 'path';

export const PROJETOSWEBFULL_BASE_PATH = process.env.PROJETOSWEBFULL_BASE_PATH || 'D:\\ProjetosWebfull';

/**
 * Escaneia todas as pastas filhas do diretório base como projetos.
 * Pastas sem tipo específico são aceitas como tipo 'generic'.
 */
export async function scanProjetosWebfull(customPath = null) {
  const basePath = customPath || PROJETOSWEBFULL_BASE_PATH;

  if (!fs.existsSync(basePath)) {
    throw new Error(`Diretório não encontrado: ${basePath}`);
  }

  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // Ignorar a própria pasta do WebfullSec e pastas de sistema
    if (entry.name === 'WebfullSec' || entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const projectPath = path.join(basePath, entry.name);
    const projectData = await extractProjectData(entry.name, projectPath);

    // Aceita qualquer pasta — mesmo as do tipo 'generic'
    if (projectData.isValid) {
      projects.push(projectData);
    }
  }

  return projects;
}

/**
 * Extrai dados de um projeto a partir do caminho.
 */
async function extractProjectData(projectName, projectPath) {
  // Verifica se tem pelo menos 1 arquivo ou subpasta para ser válido
  let hasContent = false;
  try {
    const children = fs.readdirSync(projectPath);
    hasContent = children.length > 0;
  } catch {
    return { name: projectName, path: projectPath, isValid: false };
  }

  if (!hasContent) {
    return { name: projectName, path: projectPath, isValid: false };
  }

  const projectType = detectProjectType(projectPath);
  const techStack = detectTechStack(projectPath);
  const packageJson = loadPackageJson(projectPath);
  const composerJson = loadComposerJson(projectPath);
  const gitRepo = findGitRemote(projectPath);
  const fileCount = countFiles(projectPath);

  let wpVersion = null;
  let themeName = null;
  let plugins = [];

  if (projectType === 'wordpress') {
    const wpContentPath = path.join(projectPath, 'wp-content');
    try {
      const versionPath = path.join(projectPath, 'wp-includes', 'version.php');
      if (fs.existsSync(versionPath)) {
        const content = fs.readFileSync(versionPath, 'utf-8');
        const match = content.match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);
        if (match) wpVersion = match[1];
      }
    } catch {}

    try {
      const themePath = path.join(wpContentPath, 'themes');
      if (fs.existsSync(themePath)) {
        const themes = fs.readdirSync(themePath).filter(f => {
          try { return fs.statSync(path.join(themePath, f)).isDirectory(); } catch { return false; }
        });
        const activeTheme = themes.find(t => fs.existsSync(path.join(themePath, t, 'style.css')));
        if (activeTheme) {
          const styleCss = fs.readFileSync(path.join(themePath, activeTheme, 'style.css'), 'utf-8');
          const match = styleCss.match(/Theme Name:\s*([^\n]+)/);
          themeName = match ? match[1].trim() : activeTheme;
        }
      }
    } catch {}

    try {
      const pluginsPath = path.join(wpContentPath, 'plugins');
      if (fs.existsSync(pluginsPath)) {
        plugins = fs.readdirSync(pluginsPath).filter(f => {
          try { return fs.statSync(path.join(pluginsPath, f)).isDirectory(); } catch { return false; }
        });
      }
    } catch {}
  }

  return {
    name: projectName,
    path: projectPath,
    type: projectType,
    isValid: true,
    techStack,
    packageJson,
    composerJson,
    gitRepo,
    fileCount,
    wpVersion,
    themeName,
    plugins,
  };
}

/**
 * Detecta o tipo do projeto com base nos arquivos presentes.
 * Retorna 'generic' para projetos não identificados.
 */
function detectProjectType(projectPath) {
  const indicators = {
    wordpress: ['wp-config.php', 'wp-content'],
    nextjs: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    laravel: ['artisan'],
    nodejs: ['package.json'],
    php: ['index.php', 'composer.json'],
    python: ['requirements.txt', 'setup.py', 'pyproject.toml'],
    go: ['go.mod'],
    rust: ['Cargo.toml'],
  };

  for (const [type, files] of Object.entries(indicators)) {
    for (const file of files) {
      if (fs.existsSync(path.join(projectPath, file))) {
        // Refinar: Next.js tem precedência sobre nodejs
        if (type === 'nodejs') {
          if (
            fs.existsSync(path.join(projectPath, 'next.config.js')) ||
            fs.existsSync(path.join(projectPath, 'next.config.mjs')) ||
            fs.existsSync(path.join(projectPath, 'next.config.ts'))
          ) {
            return 'nextjs';
          }
        }
        // Refinar: Laravel tem precedência sobre php
        if (type === 'php' && fs.existsSync(path.join(projectPath, 'artisan'))) {
          return 'laravel';
        }
        return type;
      }
    }
  }

  // Qualquer pasta com conteúdo é um projeto genérico
  return 'generic';
}

/**
 * Detecta as tecnologias usadas no projeto.
 */
function detectTechStack(projectPath) {
  const stack = [];

  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      stack.push('Node.js');
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps.next) stack.push('Next.js');
      if (allDeps.react) stack.push('React');
      if (allDeps.express) stack.push('Express');
      if (allDeps.vue) stack.push('Vue');
      if (allDeps['@prisma/client'] || allDeps.prisma) stack.push('Prisma');
      if (allDeps.tailwindcss) stack.push('TailwindCSS');
      if (allDeps.typescript) stack.push('TypeScript');
    } catch {}
  }

  const compPath = path.join(projectPath, 'composer.json');
  if (fs.existsSync(compPath)) {
    try {
      const composer = JSON.parse(fs.readFileSync(compPath, 'utf-8'));
      stack.push('PHP');
      if (composer.require?.['laravel/framework']) stack.push('Laravel');
    } catch {}
  }

  if (fs.existsSync(path.join(projectPath, 'wp-config.php'))) {
    stack.push('WordPress');
  }
  if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) {
    stack.push('Python');
  }
  if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
    stack.push('Go');
  }
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
    stack.push('Rust');
  }

  return [...new Set(stack)]; // Remove duplicatas
}

function loadPackageJson(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      scripts: Object.keys(pkg.scripts || {}),
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
    };
  } catch {
    return null;
  }
}

function loadComposerJson(projectPath) {
  const compPath = path.join(projectPath, 'composer.json');
  if (!fs.existsSync(compPath)) return null;
  try {
    const composer = JSON.parse(fs.readFileSync(compPath, 'utf-8'));
    return {
      name: composer.name,
      version: composer.version,
      description: composer.description,
      require: composer.require ? Object.keys(composer.require) : [],
    };
  } catch {
    return null;
  }
}

function findGitRemote(projectPath) {
  const configPath = path.join(projectPath, '.git', 'config');
  if (!fs.existsSync(configPath)) return null;
  try {
    const config = fs.readFileSync(configPath, 'utf-8');
    const remoteMatch = config.match(/url\s*=\s*(.+)/);
    return remoteMatch ? remoteMatch[1].trim() : null;
  } catch {
    return null;
  }
}

function countFiles(projectPath, maxDepth = 3) {
  let count = 0;
  const countDir = (dir, depth = 0) => {
    if (depth > maxDepth) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.next') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile()) count++;
        else if (entry.isDirectory()) countDir(fullPath, depth + 1);
      }
    } catch {}
  };
  countDir(projectPath);
  return count;
}

export async function getProjectDetails(projectName) {
  const projects = await scanProjetosWebfull();
  return projects.find(p => p.name.toLowerCase() === projectName.toLowerCase()) || null;
}

export default {
  scanProjetosWebfull,
  getProjectDetails,
  PROJETOSWEBFULL_BASE_PATH,
};
