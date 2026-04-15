/**
 * ============================================
 * WebfullSec — ProjetosWebfull Scanner
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Escaneia projetos em D:\ProjetosWebfull:
 * - Detecta projetos (Node, PHP, WordPress, etc)
 * - Extrai metadados (tipo, tech stack, package.json)
 */

import fs from 'fs';
import path from 'path';

export const PROJETOSWEBFULL_BASE_PATH = process.env.PROJETOSWEBFULL_BASE_PATH || 'D:\\ProjetosWebfull';

export async function scanProjetosWebfull(customPath = null) {
  const basePath = customPath || PROJETOSWEBFULL_BASE_PATH;
  
  if (!fs.existsSync(basePath)) {
    throw new Error(`Diretório não encontrado: ${basePath}`);
  }

  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const projectPath = path.join(basePath, entry.name);
    const projectData = await extractProjectData(entry.name, projectPath);
    
    if (projectData.isValid) {
      projects.push(projectData);
    }
  }

  return projects;
}

async function extractProjectData(projectName, projectPath) {
  const projectType = detectProjectType(projectPath);
  const isValid = projectType !== 'unknown';

  if (!isValid) {
    return { name: projectName, path: projectPath, isValid: false };
  }

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

function detectProjectType(projectPath) {
  const indicators = {
    wordpress: ['wp-config.php', 'wp-content', 'wp-includes'],
    nextjs: ['next.config.js', 'next.config.mjs'],
    react: ['package.json', 'src/App.js', 'src/index.js'],
    nodejs: ['package.json', 'server.js', 'index.js'],
    php: ['index.php', 'composer.json'],
    laravel: ['composer.json', 'artisan', 'app/Http'],
    python: ['requirements.txt', 'setup.py', 'pyproject.toml'],
    go: ['go.mod', 'main.go'],
    rust: ['Cargo.toml'],
  };

  for (const [type, files] of Object.entries(indicators)) {
    for (const file of files) {
      if (fs.existsSync(path.join(projectPath, file))) {
        if (type === 'nodejs' && fs.existsSync(path.join(projectPath, 'next.config.js'))) {
          return 'nextjs';
        }
        if (type === 'php' && fs.existsSync(path.join(projectPath, 'composer.json'))) {
          try {
            const composer = JSON.parse(fs.readFileSync(path.join(projectPath, 'composer.json'), 'utf-8'));
            if (composer.require?.laravel) return 'laravel';
          } catch {}
        }
        return type;
      }
    }
  }

  return 'unknown';
}

function detectTechStack(projectPath) {
  const stack = [];

  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      stack.push('Node.js');
      if (pkg.dependencies) {
        if (pkg.dependencies.next) stack.push('Next.js');
        if (pkg.dependencies.react) stack.push('React');
        if (pkg.dependencies.express) stack.push('Express');
        if (pkg.dependencies.vue) stack.push('Vue');
        if (pkg.dependencies.Prisma) stack.push('Prisma');
        if (pkg.dependencies.tailwindcss) stack.push('TailwindCSS');
        if (pkg.dependencies.typescript) stack.push('TypeScript');
      }
      if (pkg.devDependencies) {
        if (pkg.devDependencies.next) stack.push('Next.js');
        if (pkg.devDependencies.typescript) stack.push('TypeScript');
      }
    } catch {}
  }

  const compPath = path.join(projectPath, 'composer.json');
  if (fs.existsSync(compPath)) {
    try {
      const composer = JSON.parse(fs.readFileSync(compPath, 'utf-8'));
      stack.push('PHP');
      if (composer.require) {
        if (composer.require.laravel) stack.push('Laravel');
        if (composer.require.wordpress) stack.push('WordPress');
      }
    } catch {}
  }

  const wpPath = path.join(projectPath, 'wp-config.php');
  if (fs.existsSync(wpPath)) {
    stack.push('WordPress');
  }

  const reqPath = path.join(projectPath, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    stack.push('Python');
  }

  const goPath = path.join(projectPath, 'go.mod');
  if (fs.existsSync(goPath)) {
    stack.push('Go');
  }

  const cargoPath = path.join(projectPath, 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    stack.push('Rust');
  }

  return stack;
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
  const gitDir = path.join(projectPath, '.git');
  if (!fs.existsSync(gitDir)) return null;

  try {
    const configPath = path.join(gitDir, 'config');
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf-8');
      const remoteMatch = config.match(/url\s*=\s*(.+)/);
      if (remoteMatch) {
        return remoteMatch[1].trim();
      }
    }
  } catch {}

  return null;
}

function countFiles(projectPath, maxDepth = 3) {
  let count = 0;
  
  const countDir = (dir, depth = 0) => {
    if (depth > maxDepth) return;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile()) {
          count++;
        } else if (entry.isDirectory()) {
          countDir(fullPath, depth + 1);
        }
      }
    } catch {}
  };
  
  countDir(projectPath);
  return count;
}

export async function getProjectDetails(projectName) {
  const projects = await scanProjetosWebfull();
  const project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
  
  if (!project) return null;
  return project;
}

export default {
  scanProjetosWebfull,
  getProjectDetails,
  PROJETOSWEBFULL_BASE_PATH,
};
