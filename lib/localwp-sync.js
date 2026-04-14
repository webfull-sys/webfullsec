/**
 * ============================================
 * WebfullSec — LocalWP Sync (Sincronização Total)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Sincronização completa entre LocalWP e WebfullSec:
 * - Cria projetos automaticamente a partir dos sites
 * - Sincroniza em tempo real
 * - Popula dados completos do WordPress
 * - Mantém tasks, memórias, timeline
 */

import prisma from '@/lib/prisma';
import { scanLocalWpSites, getSiteDetails } from './localwp-scanner';

export async function syncAllSites() {
  const localwpSites = await scanLocalWpSites();
  const results = {
    synced: [],
    created: [],
    errors: [],
  };

  for (const site of localwpSites) {
    try {
      const result = await syncSite(site.name);
      if (result.created) {
        results.created.push(site.name);
      } else {
        results.synced.push(site.name);
      }
    } catch (error) {
      results.errors.push({ site: site.name, error: error.message });
    }
  }

  return results;
}

export async function syncSite(siteName) {
  const siteData = await getSiteDetails(siteName);
  
  if (!siteData || !siteData.isValid) {
    throw new Error(`Site não encontrado ou inválido: ${siteName}`);
  }

  const existingProject = await prisma.project.findFirst({
    where: {
      OR: [
        { title: { equals: siteName, mode: 'insensitive' } },
        { description: { contains: siteData.path, mode: 'insensitive' } },
      ],
    },
  });

  let project;
  let isNew = false;

  if (existingProject) {
    project = await prisma.project.update({
      where: { id: existingProject.id },
      data: {
        description: `Projeto WordPress sincronizado do LocalWP\nCaminho: ${siteData.path}\nDomínio: ${siteData.domain}`,
        category: 'site',
        status: existingProject.status || 'in_progress',
      },
    });
  } else {
    project = await prisma.project.create({
      data: {
        title: siteName,
        description: `Projeto WordPress sincronizado do LocalWP\nCaminho: ${siteData.path}\nDomínio: ${siteData.domain}`,
        category: 'site',
        status: 'in_progress',
        priority: 2,
        generalContext: `## Dados do LocalWP\n- WP Version: ${siteData.wpVersion || '?'}\n- Tema: ${siteData.themeName || '?'}\n- Plugins: ${siteData.plugins.length}\n- Banco: ${siteData.dbType}`,
        icon: '🟦',
        tags: JSON.stringify(['wordpress', 'localwp', siteData.wpVersion || 'wp-desconhecido']),
      },
    });
    isNew = true;
  }

  await prisma.projectLink.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      localPath: siteData.path,
      techStack: JSON.stringify({
        wpVersion: siteData.wpVersion,
        phpVersion: siteData.phpVersion,
        theme: siteData.themeName,
        plugins: siteData.plugins,
        dbType: siteData.dbType,
      }),
    },
    update: {
      localPath: siteData.path,
      techStack: JSON.stringify({
        wpVersion: siteData.wpVersion,
        phpVersion: siteData.phpVersion,
        theme: siteData.themeName,
        plugins: siteData.plugins,
        dbType: siteData.dbType,
      }),
      lastSyncAt: new Date(),
    },
  });

  return {
    projectId: project.id,
    projectTitle: project.title,
    isNew,
    siteData,
  };
}

export async function getSyncStatus() {
  const localwpSites = await scanLocalWpSites();
  const localwpNames = localwpSites.map(s => s.name);

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { description: { contains: 'LocalWP' } },
        { description: { contains: 'Local Sites' } },
      ],
    },
    include: {
      projectLink: true,
      _count: { select: { tasks: true } },
    },
  });

  const syncedProjects = projects.filter(p => 
    p.projectLink?.localPath?.includes('Local Sites')
  );
  const syncedNames = syncedProjects.map(p => p.title);

  const missing = localwpNames.filter(n => !syncedNames.includes(n));
  const extra = syncedNames.filter(n => !localwpNames.includes(n));

  return {
    localwpTotal: localwpSites.length,
    syncedTotal: syncedProjects.length,
    localwpSites: localwpNames,
    syncedProjects: syncedNames,
    missing,
    extra,
  };
}

export async function createAllProjectsFromLocalWP() {
  const results = await syncAllSites();
  return results;
}

export async function getProjectWithLocalwpDetails(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: { orderBy: { createdAt: 'desc' }, take: 20 },
      memories: { orderBy: { createdAt: 'desc' }, take: 10 },
      projectLink: true,
      blocks: { orderBy: { position: 'asc' }, take: 50 },
    },
  });

  if (!project) return null;

  let localwpDetails = null;
  if (project.projectLink?.localPath) {
    const siteName = project.title;
    localwpDetails = await getSiteDetails(siteName);
  }

  return {
    ...project,
    localwpDetails,
  };
}

export async function getAllProjectsFromLocalWP() {
  const localwpSites = await scanLocalWpSites();
  const projects = [];

  for (const site of localwpSites) {
    const project = await prisma.project.findFirst({
      where: { title: { equals: site.name, mode: 'insensitive' } },
      include: {
        _count: { select: { tasks: true } },
        projectLink: true,
      },
    });

    projects.push({
      localwp: site,
      project: project || null,
      isLinked: !!project,
    });
  }

  return projects;
}

export default {
  syncAllSites,
  syncSite,
  getSyncStatus,
  createAllProjectsFromLocalWP,
  getProjectWithLocalwpDetails,
  getAllProjectsFromLocalWP,
};