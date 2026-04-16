/**
 * ============================================
 * WebfullSec — API: ProjetosWebfull Sync
 * POST /api/projetoswebfull/sync — Recebe projetos do script local ou N8N
 * GET  /api/projetoswebfull/sync?action=status — Status dos projetos
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Validação do header de autorização.
 */
function isAuthorized(request) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.WEBHOOK_API_KEY || process.env.N8N_API_KEY;
  if (!expectedKey) return true;
  return apiKey === expectedKey;
}

/**
 * Retorna o ícone adequado para cada tipo de projeto.
 */
function getProjectIcon(type) {
  const icons = {
    wordpress: '🟦',
    nextjs: '⚛️',
    react: '⚛️',
    nodejs: '🟢',
    php: '🐘',
    laravel: '🦁',
    python: '🐍',
    go: '🔵',
    rust: '🦀',
    generic: '📁',
    unknown: '📁',
  };
  return icons[type] || '📁';
}

/**
 * Cria ou atualiza um projeto em D:\ProjetosWebfull a partir dos dados enviados.
 * @param {object} projectData - Dados do projeto
 */
async function upsertProjetosWebfullProject(projectData) {
  const name = projectData.name;
  if (!name) throw new Error('Nome do projeto é obrigatório');

  const type = projectData.type || 'generic';
  const techStackStr = Array.isArray(projectData.techStack) ? projectData.techStack.join(', ') : '';

  const description = `## Projeto em D:\\ProjetosWebfull\n\n**Caminho:** ${projectData.path || 'N/A'}\n**Tipo:** ${type}\n**Tech Stack:** ${techStackStr || 'N/A'}\n**Arquivos:** ${projectData.fileCount || 0}\n${projectData.gitRepo ? `**Git:** ${projectData.gitRepo}` : ''}`;

  const generalContext = `## Dados Técnicos\n- Tipo: ${type}\n- Tech Stack: ${techStackStr || 'N/A'}\n- Arquivos: ${projectData.fileCount || 0}\n- Git: ${projectData.gitRepo || 'N/A'}`;

  const tags = JSON.stringify([type, 'projetoswebfull', ...(Array.isArray(projectData.techStack) ? projectData.techStack : [])]);
  const category = type === 'wordpress' ? 'site' : 'app';

  const existingProject = await prisma.project.findFirst({
    where: { title: name },
  });

  let project;
  let isNew = false;

  if (existingProject) {
    project = await prisma.project.update({
      where: { id: existingProject.id },
      data: { description, generalContext, tags },
    });
  } else {
    project = await prisma.project.create({
      data: {
        title: name,
        description,
        category,
        status: 'in_progress',
        priority: 2,
        generalContext,
        icon: getProjectIcon(type),
        tags,
      },
    });
    isNew = true;

    // Notificação de novo projeto
    await prisma.notification.create({
      data: {
        title: `${getProjectIcon(type)} Novo projeto detectado: ${name}`,
        message: `O projeto "${name}" (${type}) foi sincronizado de D:\\ProjetosWebfull.`,
        type: 'info',
        link: `/projects/${project.id}`,
      },
    });
  }

  // Upsert ProjectLink
  const techStackSerialized = JSON.stringify({
    projectType: type,
    techStack: projectData.techStack,
    packageJson: projectData.packageJson,
    gitRepo: projectData.gitRepo,
    wpVersion: projectData.wpVersion,
    themeName: projectData.themeName,
    plugins: projectData.plugins,
    source: 'projetoswebfull',
  });

  const existingLink = await prisma.projectLink.findUnique({ where: { projectId: project.id } });

  if (existingLink) {
    await prisma.projectLink.update({
      where: { projectId: project.id },
      data: { localPath: projectData.path, techStack: techStackSerialized, lastSyncAt: new Date() },
    });
  } else {
    await prisma.projectLink.create({
      data: { projectId: project.id, localPath: projectData.path, techStack: techStackSerialized, lastSyncAt: new Date() },
    });
  }

  return { projectId: project.id, projectTitle: project.title, isNew };
}

// =============================================
// POST — Recebe dados do script local ou do N8N
// =============================================
export async function POST(request) {
  if (process.env.NODE_ENV === 'production' && !isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, project, projects } = body;

    // action=upsertProject — Um único projeto
    if (action === 'upsertProject' && project) {
      const result = await upsertProjetosWebfullProject(project);
      return NextResponse.json({ success: true, ...result });
    }

    // action=bulkSync — Lista de projetos (enviados pelo script local em lote)
    if (action === 'bulkSync' && Array.isArray(projects)) {
      const results = [];
      for (const proj of projects) {
        try {
          const result = await upsertProjetosWebfullProject(proj);
          results.push({ name: proj.name, ...result, success: true });
        } catch (err) {
          results.push({ name: proj.name, success: false, error: err.message });
        }
      }
      const created = results.filter(r => r.success && r.isNew).length;
      const updated = results.filter(r => r.success && !r.isNew).length;
      return NextResponse.json({ success: true, created, updated, results });
    }

    // action=ping — Verificação de disponibilidade
    if (action === 'ping') {
      return NextResponse.json({ success: true, message: 'WebfullSec online!', timestamp: new Date().toISOString() });
    }

    return NextResponse.json({
      error: 'Ação inválida. Use action=upsertProject, action=bulkSync ou action=ping',
    }, { status: 400 });
  } catch (error) {
    console.error('[API ProjetosWebfull Sync] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =============================================
// GET — Status dos projetos no banco
// =============================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'status') {
    try {
      const projects = await prisma.project.findMany({
        where: { tags: { contains: 'projetoswebfull' } },
        include: {
          projectLink: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return NextResponse.json({
        total: projects.length,
        projects: projects.map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
          localPath: p.projectLink?.localPath,
          lastSyncAt: p.projectLink?.lastSyncAt,
          tasksCount: p._count.tasks,
        })),
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: 'ProjetosWebfull Sync API v2.0',
    endpoints: {
      'POST action=upsertProject': 'Cria/atualiza um projeto. Body: { action, project: { name, path, type, ... } }',
      'POST action=bulkSync': 'Sincroniza múltiplos projetos. Body: { action, projects: [...] }',
      'POST action=ping': 'Verifica disponibilidade',
      'GET ?action=status': 'Lista projetos no banco',
    },
  });
}
