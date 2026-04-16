/**
 * ============================================
 * WebfullSec — API: Scan de Pasta Customizada
 * POST /api/projects/scan-folder
 * Recebe um caminho de pasta e retorna metadados do projeto detectado
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

/** Detecta o tipo de projeto pelo conteúdo da pasta */
function detectProjectType(projectPath) {
  if (fs.existsSync(path.join(projectPath, 'wp-config.php'))) return 'wordpress';
  if (
    fs.existsSync(path.join(projectPath, 'next.config.js')) ||
    fs.existsSync(path.join(projectPath, 'next.config.mjs')) ||
    fs.existsSync(path.join(projectPath, 'next.config.ts'))
  ) return 'nextjs';
  if (fs.existsSync(path.join(projectPath, 'artisan'))) return 'laravel';
  if (fs.existsSync(path.join(projectPath, 'package.json'))) return 'nodejs';
  if (fs.existsSync(path.join(projectPath, 'composer.json'))) return 'php';
  if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) return 'python';
  if (fs.existsSync(path.join(projectPath, 'go.mod'))) return 'go';
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) return 'rust';
  return 'generic';
}

/** Detecta o ícone pelo tipo de projeto */
function getProjectIcon(type) {
  const icons = {
    wordpress: '🟦', nextjs: '⚛️', react: '⚛️', nodejs: '🟢',
    laravel: '🦁', php: '🐘', python: '🐍', go: '🔵', rust: '🦀', generic: '📁',
  };
  return icons[type] || '📁';
}

/** Detecta o tech stack usado no projeto */
function detectTechStack(projectPath) {
  const stack = [];
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      stack.push('Node.js');
      if (deps.next) stack.push('Next.js');
      if (deps.react) stack.push('React');
      if (deps.express) stack.push('Express');
      if (deps['@prisma/client'] || deps.prisma) stack.push('Prisma');
      if (deps.tailwindcss) stack.push('TailwindCSS');
      if (deps.typescript) stack.push('TypeScript');
      if (deps.vue) stack.push('Vue');
    }
  } catch {}
  if (fs.existsSync(path.join(projectPath, 'wp-config.php'))) stack.push('WordPress');
  if (fs.existsSync(path.join(projectPath, 'composer.json'))) stack.push('PHP');
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

/** Conta arquivos superficialmente (rápido) */
function countFiles(projectPath, maxDepth = 2) {
  let count = 0;
  const walk = (dir, depth = 0) => {
    if (depth > maxDepth) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '.next') continue;
        if (e.isFile()) count++;
        else if (e.isDirectory()) walk(path.join(dir, e.name), depth + 1);
      }
    } catch {}
  };
  walk(projectPath);
  return count;
}

/** Extrai nome do tema WordPress ativo */
function getWordPressTheme(projectPath) {
  try {
    const themesPath = path.join(projectPath, 'wp-content', 'themes');
    if (!fs.existsSync(themesPath)) return null;
    const themes = fs.readdirSync(themesPath).filter(f =>
      fs.statSync(path.join(themesPath, f)).isDirectory()
    );
    const active = themes.find(t => fs.existsSync(path.join(themesPath, t, 'style.css')));
    if (!active) return null;
    const css = fs.readFileSync(path.join(themesPath, active, 'style.css'), 'utf-8');
    const match = css.match(/Theme Name:\s*([^\n]+)/);
    return match ? match[1].trim() : active;
  } catch {
    return null;
  }
}

// =============================================
// POST /api/projects/scan-folder
// Body: { folderPath: "C:\\caminho\\do\\projeto" }
// =============================================
export async function POST(request) {
  try {
    const body = await request.json();
    const folderPath = body.folderPath?.trim();

    if (!folderPath) {
      return NextResponse.json({ error: 'Informe o caminho da pasta (folderPath).' }, { status: 400 });
    }

    // Valida se o caminho existe
    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({ error: `Caminho não encontrado: ${folderPath}` }, { status: 404 });
    }

    const stat = fs.statSync(folderPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'O caminho informado não é uma pasta.' }, { status: 400 });
    }

    // Extrai o nome do projeto do caminho (última parte)
    const projectName = path.basename(folderPath);
    const projectType = detectProjectType(folderPath);
    const techStack = detectTechStack(folderPath);
    const gitRepo = getGitRemote(folderPath);
    const fileCount = countFiles(folderPath);
    const themeName = projectType === 'wordpress' ? getWordPressTheme(folderPath) : null;
    const icon = getProjectIcon(projectType);

    // Verifica se o projeto já existe no banco
    const existing = await prisma.project.findFirst({
      where: { title: { equals: projectName } },
    });

    return NextResponse.json({
      success: true,
      detected: {
        name: projectName,
        path: folderPath,
        type: projectType,
        icon,
        techStack,
        gitRepo,
        fileCount,
        themeName,
        alreadyExists: !!existing,
        existingProjectId: existing?.id || null,
      },
    });
  } catch (error) {
    console.error('[API scan-folder] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
