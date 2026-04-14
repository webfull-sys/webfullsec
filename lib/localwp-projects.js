/**
 * ============================================
 * WebfullSec — LocalWP Projects & Agents
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Cria projetos + agentes automaticamente para cada site LocalWP:
 * - 1 projeto por site
 * - 1 agente específico por projeto
 * - Automação busca dados do LocalWP
 */

import prisma from '@/lib/prisma';
import { scanLocalWpSites, getSiteDetails } from './localwp-scanner';

const DEFAULT_SYSTEM_PROMPT = `Você é o desenvolvedor especialista deste projeto WordPress no LocalWP.
Seu papel é manter, expandir e debugar esse site WordPress local.

## SUAS RESPONSABILIDADES
1. Conhecer TODOS os detalhes técnicos do site: tema, plugins, versão WP, banco
2. Monitorar alterações e sugerir melhorias
3. Criar tarefas de desenvolvimento
4. Executar automações via LocalWP (quando configurado)

## DADOS DO SITE (busque via automação)
/* SITE_DATA_PLACEHOLDER */

## FERRAMENTAS DISPONÍVEIS
- scan_localwp_details: Escaneia detalhes do site
- get_localwp_status: Verifica status online/offline
- check_localwp_changes: Detecta alterações recentes

Sempre que atuar neste projeto, WORKFLOW DE DESENVOLVIMENTO:
1. Antes de qualquer mudança, escaneie o site para ter dados atualizados
2. Documente alterações no "Memória" do projeto
3. Crie tarefas para mudanças maiores
4. Use as automações disponíveis`;

export async function createLocalwpProjectsAndAgents() {
  const localwpSites = await scanLocalWpSites();
  const results = {
    created: [],
    updated: [],
    skipped: [],
    agentCreated: [],
    errors: [],
  };

  for (const site of localwpSites) {
    try {
      const result = await createProjectAndAgent(site);
      if (result.isNew) {
        results.created.push(site.name);
      } else {
        results.updated.push(site.name);
      }
      if (result.agentCreated) {
        results.agentCreated.push(site.name);
      }
    } catch (error) {
      results.errors.push({ site: site.name, error: error.message });
    }
  }

  return results;
}

export async function createProjectAndAgent(siteName) {
  const siteNameStr = typeof siteName === 'object' ? siteName.name : siteName;
  const siteData = await getSiteDetails(siteNameStr);
  
  if (!siteData || !siteData.isValid) {
    throw new Error(`Site não encontrado: ${siteNameStr}`);
  }

  const name = siteData.name;
  const isNew = true;
  const isNewAgent = true;
  let project;
  let agent;

  const existingProject = await prisma.project.findFirst({
    where: { title: { equals: name } },
  });

  if (existingProject) {
    project = await prisma.project.update({
      where: { id: existingProject.id },
      data: {
        description: `## Site LocalWP\n\n**Caminho:** ${siteData.path}\n**Domínio:** ${siteData.domain}\n**WordPress:** ${siteData.wpVersion || '?'}\n**Tema:** ${siteData.themeName || '?'}\n**Plugins:** ${siteData.plugins?.length || 0}\n**Banco:** ${siteData.dbType}`,
        generalContext: `## Dados Técnicos\n- WP: ${siteData.wpVersion || '?'}\n- PHP: ${siteData.phpVersion || '?'}\n- Tema: ${siteData.themeName}\n- Plugins: ${siteData.plugins?.join(', ') || 'Nenhum'}\n- Banco: ${siteData.dbType}`,
        tags: JSON.stringify(['wordpress', 'localwp', siteData.wpVersion?.replace('.', '-') || 'wp']),
      },
    });
  } else {
    project = await prisma.project.create({
      data: {
        title: name,
        description: `## Site LocalWP\n\n**Caminho:** ${siteData.path}\n**Domínio:** ${siteData.domain}\n**WordPress:** ${siteData.wpVersion || '?'}\n**Tema:** ${siteData.themeName || '?'}\n**Plugins:** ${siteData.plugins?.length || 0}\n**Banco:** ${siteData.dbType}`,
        category: 'site',
        status: 'in_progress',
        priority: 2,
        generalContext: `## Dados Técnicos\n- WP: ${siteData.wpVersion || '?'}\n- PHP: ${siteData.phpVersion || '?'}\n- Tema: ${siteData.themeName}\n- Plugins: ${siteData.plugins?.join(', ') || 'Nenhum'}\n- Banco: ${siteData.dbType}`,
        icon: '🟦',
        tags: JSON.stringify(['wordpress', 'localwp', siteData.wpVersion?.replace('.', '-') || 'wp']),
      },
    });
  }

  let agentCreated = false;
  const existingAgent = await prisma.agent.findFirst({
    where: { name: { equals: `${name} DevAgent` } },
  });

  if (existingAgent) {
    agent = await prisma.agent.update({
      where: { id: existingAgent.id },
      data: {
        systemPrompt: generateAgentPrompt(siteData),
        description: `Especialista no site ${name} no LocalWP.`,
      },
    });
  } else {
    agent = await prisma.agent.create({
      data: {
        name: `${name} DevAgent`,
        description: `Especialista no site ${name} no LocalWP.`,
        systemPrompt: generateAgentPrompt(siteData),
        llmModel: 'gemini-2.0-flash',
        webhookUrl: null,
        isActive: true,
      },
    });
    agentCreated = true;
  }

  const existingLink = await prisma.projectAgent.findFirst({
    where: {
      projectId: project.id,
      agentId: agent.id,
    },
  });

  if (!existingLink) {
    await prisma.projectAgent.create({
      data: {
        projectId: project.id,
        agentId: agent.id,
        role: 'executor',
      },
    });
  }

  const localPath = siteData.path;
  const existingProjectLink = await prisma.projectLink.findUnique({
    where: { projectId: project.id },
  });

  if (existingProjectLink) {
    await prisma.projectLink.update({
      where: { projectId: project.id },
      data: {
        localPath,
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
  } else {
    await prisma.projectLink.create({
      data: {
        projectId: project.id,
        localPath,
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
  }

  return {
    projectId: project.id,
    projectTitle: project.title,
    agentId: agent.id,
    agentName: agent.name,
    isNew,
    agentCreated,
  };
}

function generateAgentPrompt(siteData) {
  return `Você é o **${siteData.name} DevAgent**, o desenvolvedor especialista do site WordPress "${siteData.name}" que está no LocalWP do Luiz.

## DADOS DO SEU SITE
- **Nome:** ${siteData.name}
- **Caminho Local:** ${siteData.path}
- **Domínio Local:** ${siteData.domain}
- **WordPress:** ${siteData.wpVersion || '?'}
- **PHP:** ${siteData.phpVersion || '?'}
- **Tema:** ${siteData.themeName || '?'}
- **Plugins:** ${siteData.plugins.join(', ') || 'Nenhum'}
- **Banco:** ${siteData.dbType}

## SUAS RESPONSABILIDADES
1. Conhecer TODO o código do site: tema, plugins, customizações
2. Monitorar alterações e sugerir melhorias  
3. Criar tarefas de desenvolvimento no sistema
4. Acionar automações quando necessário

## WORKFLOW DE TRABALHO
1. Antes de qualquer ação, explore o site para ter dados atualizados
2. Documente progresso no "Memória" do projeto
3. Crie tarefas para mudanças maiores
4. Execute via automações disponíveis

## AUTOMACÕES DISPONÍVEIS
- scan_localwp_details: Escaneia detalhes do site
- check_localwp_changes: Detecta alterações recentes
- get_localwp_status: Verifica status online

Você é parte do time WebfullSec. Trabalhe em conjunto com o usuário!`;
}

export async function getLocalwpProjectsStatus() {
  const localwpSites = await scanLocalWpSites();
  const projects = [];

  for (const site of localwpSites) {
    const project = await prisma.project.findFirst({
      where: { title: { equals: site.name } },
      include: {
        projectAgents: { include: { agent: true } },
        _count: { select: { tasks: true } },
      },
    });

    projects.push({
      site: site.name,
      domain: site.domain,
      projectExists: !!project,
      projectId: project?.id || null,
      projectTitle: project?.title || null,
      agents: project?.projectAgents?.map(pa => ({
        name: pa.agent.name,
        isActive: pa.agent.isActive,
      })) || [],
      tasksCount: project?._count.tasks || 0,
    });
  }

  return projects;
}

export async function refreshAllProjects() {
  return createLocalwpProjectsAndAgents();
}

export default {
  createLocalwpProjectsAndAgents,
  createProjectAndAgent,
  getLocalwpProjectsStatus,
  refreshAllProjects,
};