/**
 * ============================================
 * WebfullSec — Custom Project Scanner
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Escaneia qualquer diretório customizado e cria projeto no WebfullSec
 */

import fs from 'fs';
import path from 'path';

export async function scanCustomPath(customPath, options = {}) {
  if (!customPath) {
    throw new Error('Caminho é obrigatório');
  }

  if (!fs.existsSync(customPath)) {
    throw new Error(`Diretório não encontrado: ${customPath}`);
  }

  const stat = fs.statSync(customPath);
  if (!stat.isDirectory()) {
    throw new Error('O caminho deve ser um diretório');
  }

  const projectName = options.name || path.basename(customPath);
  
  const projectData = {
    name: projectName,
    path: customPath,
    type: detectProjectType(customPath),
    techStack: detectTechStack(customPath),
    files: countFiles(customPath),
    packageJson: loadPackageJson(customPath),
    gitRepo: findGitRemote(customPath),
    lastModified: getLastModified(customPath),
  };

  return projectData;
}

function detectProjectType(projectPath) {
  const indicators = {
    wordpress: ['wp-config.php', 'wp-content', 'wp-includes'],
    nextjs: ['next.config.js', 'next.config.mjs', 'app/page.js'],
    react: ['package.json', 'src/App.js', 'src/index.js'],
    nodejs: ['package.json', 'server.js', 'index.js'],
    php: ['index.php', 'composer.json'],
    python: ['requirements.txt', 'setup.py', 'pyproject.toml'],
    go: ['go.mod', 'main.go'],
    rust: ['Cargo.toml'],
  };

  for (const [type, files] of Object.entries(indicators)) {
    for (const file of files) {
      const fullPath = path.join(projectPath, file);
      if (fs.existsSync(fullPath)) {
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
      }
      if (pkg.devDependencies) {
        if (pkg.devDependencies.next) stack.push('Next.js');
      }
    } catch {}
  }

  const compPath = path.join(projectPath, 'composer.json');
  if (fs.existsSync(compPath)) {
    stack.push('PHP');
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

function getLastModified(projectPath) {
  let latest = 0;

  const checkDir = (dir, depth = 0) => {
    if (depth > 2) return;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isFile()) {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs > latest) {
            latest = stat.mtimeMs;
          }
        } else if (entry.isDirectory()) {
          checkDir(fullPath, depth + 1);
        }
      }
    } catch {}
  };

  checkDir(projectPath);
  return new Date(latest).toISOString();
}

export async function createProjectFromPath(customPath, options = {}) {
  const projectData = await scanCustomPath(customPath, options);
  return projectData;
}

export default {
  scanCustomPath,
  createProjectFromPath,
};