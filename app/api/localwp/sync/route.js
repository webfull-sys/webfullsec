/**
 * ============================================
 * WebfullSec — API: LocalWP Sync
 * POST /api/localwp/sync — Sincroniza sites locais ou recebe dados via webhook
 * GET  /api/localwp/sync?action=status — Status dos projetos
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Valida o cabeçalho de autorização.
 * Aceita a chave configurada em WEBHOOK_API_KEY.
 */
function isAuthorized(request) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.WEBHOOK_API_KEY || process.env.N8N_API_KEY;
  if (!expectedKey) return true; // Sem chave configurada = permite tudo (dev)
  return apiKey === expectedKey;
}

/**
 * Cria ou atualiza um projeto LocalWP a partir dos dados enviados pelo script local.
 * @param {object} siteData - Dados do site (name, path, domain, wpVersion, themeName, plugins, dbType)
 */
async function upsertLocalWpProject(siteData) {
  const name = siteData.name || siteData.siteName;
  if (!name) throw new Error('Nome do site é obrigatório');

  const description = `## Site LocalWP\n\n**Caminho:** ${siteData.path || 'N/A'}\n**Domínio:** ${siteData.domain || `${name}.local`}\n**WordPress:** ${siteData.wpVersion || '?'}\n**Tema:** ${siteData.themeName || '?'}\n**Plugins:** ${siteData.plugins?.length || 0}\n**Banco:** ${siteData.dbType || 'Unknown'}`;

  const generalContext = `## Dados Técnicos\n- WP: ${siteData.wpVersion || '?'}\n- PHP: ${siteData.phpVersion || '?'}\n- Tema: ${siteData.themeName || 'Desconhecido'}\n- Plugins: ${siteData.plugins?.join(', ') || 'Nenhum'}\n- Banco: ${siteData.dbType || 'Unknown'}`;

  const tags = JSON.stringify(['wordpress', 'localwp', ...(siteData.wpVersion ? [`wp-${siteData.wpVersion.split('.')[0]}`] : [])]);

  // Upsert do projeto
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
        category: 'site',
        status: 'in_progress',
        priority: 2,
        generalContext,
        icon: '🟦',
        tags,
      },
    });
    isNew = true;

    // Cria notificação para novo projeto
    await prisma.notification.create({
      data: {
        title: `🟦 Novo site LocalWP detectado: ${name}`,
        message: `O site "${name}" foi sincronizado automaticamente do LocalWP.`,
        type: 'info',
        link: `/projects/${project.id}`,
      },
    });
  }

  // Upsert do ProjectLink (vínculo com caminho local)
  const existingLink = await prisma.projectLink.findUnique({ where: { projectId: project.id } });
  const techStackData = JSON.stringify({
    wpVersion: siteData.wpVersion,
    phpVersion: siteData.phpVersion,
    theme: siteData.themeName,
    plugins: siteData.plugins,
    dbType: siteData.dbType,
    source: 'localwp',
  });

  if (existingLink) {
    await prisma.projectLink.update({
      where: { projectId: project.id },
      data: { localPath: siteData.path, techStack: techStackData, lastSyncAt: new Date() },
    });
  } else {
    await prisma.projectLink.create({
      data: { projectId: project.id, localPath: siteData.path, techStack: techStackData, lastSyncAt: new Date() },
    });
  }

  return { projectId: project.id, projectTitle: project.title, isNew };
}

// =============================================
// POST — Recebe dados do script local ou do N8N
// =============================================
export async function POST(request) {
  // Verificar autorização apenas em produção
  if (process.env.NODE_ENV === 'production' && !isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, site, sites } = body;

    // action=upsertSite — Cria ou atualiza um único site
    if (action === 'upsertSite' && site) {
      const result = await upsertLocalWpProject(site);
      return NextResponse.json({ success: true, ...result });
    }

    // action=bulkSync — Sincroniza uma lista de sites de uma vez
    if (action === 'bulkSync' && Array.isArray(sites)) {
      const results = [];
      for (const siteData of sites) {
        try {
          const result = await upsertLocalWpProject(siteData);
          results.push({ name: siteData.name, ...result, success: true });
        } catch (err) {
          results.push({ name: siteData.name, success: false, error: err.message });
        }
      }
      const created = results.filter(r => r.success && r.isNew).length;
      const updated = results.filter(r => r.success && !r.isNew).length;
      return NextResponse.json({ success: true, created, updated, results });
    }

    return NextResponse.json({ error: 'Ação inválida. Use action=upsertSite ou action=bulkSync' }, { status: 400 });
  } catch (error) {
    console.error('[API LocalWP Sync] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =============================================
// GET — Retorna status dos projetos LocalWP no banco
// =============================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'status') {
    try {
      // Retorna todos os projetos com tag localwp
      const projects = await prisma.project.findMany({
        where: { tags: { contains: 'localwp' } },
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
    message: 'LocalWP Sync API v2.0',
    endpoints: {
      'POST action=upsertSite': 'Cria/atualiza um site. Body: { action, site: { name, path, domain, ... } }',
      'POST action=bulkSync': 'Sincroniza múltiplos sites. Body: { action, sites: [...] }',
      'GET ?action=status': 'Lista projetos LocalWP no banco',
    },
  });
}