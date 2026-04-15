/**
 * ============================================
 * WebfullSec — ProjetosWebfull Projects & Agents
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Cria projetos + agentes automaticamente para cada projeto em D:\ProjetosWebfull:
 * - 1 projeto por pasta
 * - 1 agente específico por projeto
 * - Detecta tipo de projeto (Node, PHP, WordPress, etc)
 */

import prisma from '@/lib/prisma';
import { scanProjetosWebfull, getProjectDetails } from './projetoswebfull-scanner';

const DEFAULT_SYSTEM_PROMPT = `Você é o desenvolvedor especialista deste projeto em D:\\ProjetosWebfull.
Seu papel é manter, expandir e debugar esse projeto.

## SUAS RESPONSABILIDADES
1. Conhecer TODOS os detalhes técnicos do projeto
2. Monitorar alterações e sugerir melhorias
3. Criar tarefas de desenvolvimento
4. Executar automações quando necessário

## DADOS DO PROJETO (busque via automação)
/* PROJECT_DATA_PLACEHOLDER */

## FERRAMENTAS DISPONÍVEIS
- scan_project_details: Escaneia detalhes do projeto
- get_project_files: Lista arquivos do projeto

Sempre que atuar neste projeto, WORKFLOW DE DESENVOLVIMENTO:
1. Antes de qualquer mudança, escaneie o projeto para ter dados atualizados
2. Documente alterações no "Memória" do projeto
3. Crie tarefas para mudanças maiores
4. Use as automações disponíveis`;

export async function createProjetosWebfullProjectsAndAgents() {
  const projetos = await scanProjetosWebfull();
  const results = {
    created: [],
    updated: [],
    skipped: [],
    agentCreated: [],
    errors: [],
  };

  for (const projeto of projetos) {
    try {
      const result = await createProjectAndAgent(projeto);
      if (result.isNew) {
        results.created.push(projeto.name);
      } else {
        results.updated.push(projeto.name);
      }
      if (result.agentCreated) {
        results.agentCreated.push(projeto.name);
      }
    } catch (error) {
      results.errors.push({ projeto: projeto.name, error: error.message });
    }
  }

  return results;
}

export async function createProjectAndAgent(projectNameOrObj) {
  const projectName = typeof projectNameOrObj === 'object' ? projectNameOrObj.name : projectNameOrObj;
  const projectData = await getProjectDetails(projectName);
  
  if (!projectData || !projectData.isValid) {
    throw new Error(`Projeto não encontrado: ${projectName}`);
  }

  const name = projectData.name;
  const isNew = true;
  const isNewAgent = true;
  let project;
  let agent;

  const existingProject = await prisma.project.findFirst({
    where: { title: { equals: name } },
  });

  const techStackStr = projectData.techStack?.join(', ') || '';
  const description = `## Projeto em D:\\ProjetosWebfull\n\n**Caminho:** ${projectData.path}\n**Tipo:** ${projectData.type}\n**Tech Stack:** ${techStackStr}\n**Arquivos:** ${projectData.fileCount}\n${projectData.gitRepo ? `**Git:** ${projectData.gitRepo}` : ''}`;

  if (existingProject) {
    project = await prisma.project.update({
      where: { id: existingProject.id },
      data: {
        description,
        generalContext: `## Dados Técnicos\n- Tipo: ${projectData.type}\n- Tech Stack: ${techStackStr}\n- Arquivos: ${projectData.fileCount}\n- Git: ${projectData.gitRepo || 'N/A'}\n${projectData.wpVersion ? `- WordPress: ${projectData.wpVersion}` : ''}\n${projectData.themeName ? `- Tema: ${projectData.themeName}` : ''}\n${projectData.plugins?.length ? `- Plugins: ${projectData.plugins.length}` : ''}`,
        tags: JSON.stringify([projectData.type, 'projetoswebfull', ...projectData.techStack]),
      },
    });
  } else {
    project = await prisma.project.create({
      data: {
        title: name,
        description,
        category: projectData.type === 'wordpress' ? 'site' : 'app',
        status: 'in_progress',
        priority: 2,
        generalContext: `## Dados Técnicos\n- Tipo: ${projectData.type}\n- Tech Stack: ${techStackStr}\n- Arquivos: ${projectData.fileCount}\n- Git: ${projectData.gitRepo || 'N/A'}\n${projectData.wpVersion ? `- WordPress: ${projectData.wpVersion}` : ''}\n${projectData.themeName ? `- Tema: ${projectData.themeName}` : ''}\n${projectData.plugins?.length ? `- Plugins: ${projectData.plugins.length}` : ''}`,
        icon: getProjectIcon(projectData.type),
        tags: JSON.stringify([projectData.type, 'projetoswebfull', ...projectData.techStack]),
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
        systemPrompt: generateAgentPrompt(projectData),
        description: `Especialista no projeto ${name} em D:\\ProjetosWebfull.`,
      },
    });
  } else {
    agent = await prisma.agent.create({
      data: {
        name: `${name} DevAgent`,
        description: `Especialista no projeto ${name} em D:\\ProjetosWebfull.`,
        systemPrompt: generateAgentPrompt(projectData),
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

  const localPath = projectData.path;
  const existingProjectLink = await prisma.projectLink.findUnique({
    where: { projectId: project.id },
  });

  if (existingProjectLink) {
    await prisma.projectLink.update({
      where: { projectId: project.id },
      data: {
        localPath,
        techStack: JSON.stringify({
          projectType: projectData.type,
          techStack: projectData.techStack,
          packageJson: projectData.packageJson,
          gitRepo: projectData.gitRepo,
          wpVersion: projectData.wpVersion,
          themeName: projectData.themeName,
          plugins: projectData.plugins,
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
          projectType: projectData.type,
          techStack: projectData.techStack,
          packageJson: projectData.packageJson,
          gitRepo: projectData.gitRepo,
          wpVersion: projectData.wpVersion,
          themeName: projectData.themeName,
          plugins: projectData.plugins,
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
    unknown: '📁',
  };
  return icons[type] || '📁';
}

function generateAgentPrompt(projectData) {
  return `Você é o **${projectData.name} DevAgent**, o desenvolvedor especialista do projeto "${projectData.name}" que está em D:\\ProjetosWebfull.

## DADOS DO SEU PROJETO
- **Nome:** ${projectData.name}
- **Caminho Local:** ${projectData.path}
- **Tipo:** ${projectData.type}
- **Tech Stack:** ${projectData.techStack?.join(', ') || 'N/A'}
- **Arquivos:** ${projectData.fileCount}
${projectData.gitRepo ? `- **Git:** ${projectData.gitRepo}` : ''}
${projectData.wpVersion ? `- **WordPress:** ${projectData.wpVersion}` : ''}
${projectData.themeName ? `- **Tema:** ${projectData.themeName}` : ''}
${projectData.plugins?.length ? `- **Plugins:** ${projectData.plugins.join(', ')}` : ''}

## SUAS RESPONSABILIDADES
1. Conhecer TODO o código do projeto
2. Monitorar alterações e sugerir melhorias  
3. Criar tarefas de desenvolvimento no sistema
4. Acionar automações quando necessário

## WORKFLOW DE TRABALHO
1. Antes de qualquer ação, explore o projeto para ter dados atualizados
2. Documente progresso no "Memória" do projeto
3. Crie tarefas para mudanças maiores
4. Execute via automações disponíveis

## AUTOMACÕES DISPONÍVEIS
- scan_project_details: Escaneia detalhes do projeto
- get_project_files: Lista arquivos do projeto

Você é parte do time WebfullSec. Trabalhe em conjunto com o usuário!`;
}

export async function getProjetosWebfullStatus() {
  const projetos = await scanProjetosWebfull();
  const projects = [];

  for (const projeto of projetos) {
    const project = await prisma.project.findFirst({
      where: { title: { equals: projeto.name } },
      include: {
        projectAgents: { include: { agent: true } },
        _count: { select: { tasks: true } },
      },
    });

    projects.push({
      project: projeto.name,
      type: projeto.type,
      path: projeto.path,
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
  return createProjetosWebfullProjectsAndAgents();
}

export default {
  createProjetosWebfullProjectsAndAgents,
  createProjectAndAgent,
  getProjetosWebfullStatus,
  refreshAllProjects,
};
