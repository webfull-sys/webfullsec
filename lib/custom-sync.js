/**
 * ============================================
 * WebfullSec — Custom Projects Sync
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Sincroniza projetos de qualquer pasta configurada
 */

import prisma from '@/lib/prisma';
import { scanCustomPath } from './custom-scanner';

const CUSTOM_BASE_PATH = process.env.CUSTOM_PROJECTS_PATH || 'D:\\VibeCoding\\ProjSitesAI';

export async function scanCustomProjects() {
  const fs = await import('fs');
  const path = await import('path');
  
  if (!fs.existsSync(CUSTOM_BASE_PATH)) {
    return [];
  }

  const entries = fs.readdirSync(CUSTOM_BASE_PATH, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const projectPath = path.join(CUSTOM_BASE_PATH, entry.name);
    const isValid = fs.existsSync(path.join(projectPath, 'package.json')) ||
                  fs.existsSync(path.join(projectPath, 'composer.json')) ||
                  fs.existsSync(path.join(projectPath, 'wp-config.php')) ||
                  fs.existsSync(path.join(projectPath, 'requirements.txt'));
    
    if (isValid) {
      projects.push({
        name: entry.name,
        path: projectPath,
      });
    }
  }

  return projects;
}

export async function syncCustomProjects() {
  const projects = await scanCustomProjects();
  const results = { synced: [], created: [], errors: [] };

  for (const project of projects) {
    try {
      const existing = await prisma.project.findFirst({
        where: { title: project.name },
      });

      if (existing) {
        results.synced.push(project.name);
      } else {
        const projectData = await scanCustomPath(project.path, { name: project.name });
        
        const newProject = await prisma.project.create({
          data: {
            title: projectData.name,
            description: `## Projeto Custom\n\n**Caminho:** ${projectData.path}\n**Tipo:** ${projectData.type}\n**Tecnologias:** ${projectData.techStack.join(', ')}`,
            category: 'site',
            status: 'in_progress',
            priority: 2,
            generalContext: `## Dados Técnicos\n- Tipo: ${projectData.type}\n- Tecnologias: ${projectData.techStack.join(', ')}`,
            icon: projectData.type === 'nextjs' ? '▲' : projectData.type === 'react' ? '⚛️' : '📁',
            tags: JSON.stringify([projectData.type]),
          },
        });

        await prisma.projectLink.create({
          data: {
            projectId: newProject.id,
            localPath: projectData.path,
            techStack: JSON.stringify(projectData.techStack),
            lastSyncAt: new Date(),
          },
        });

        const agent = await prisma.agent.create({
          data: {
            name: `${projectData.name} DevAgent`,
            description: `Especialista no projeto ${projectData.name}`,
            systemPrompt: `Você é o ${projectData.name} DevAgent, desenvolvedor especialista neste projeto.\n\n## Dados\n- Tipo: ${projectData.type}\n- Tecnologias: ${projectData.techStack.join(', ')}\n\n## Responsabilidades\n1. Conhecer todo o código\n2. Criar tarefas\n3. Executar automações`,
            llmModel: 'gemini-2.0-flash',
            isActive: true,
          },
        });

        await prisma.projectAgent.create({
          data: {
            projectId: newProject.id,
            agentId: agent.id,
            role: 'executor',
          },
        });

        results.created.push(project.name);
      }
    } catch (error) {
      results.errors.push({ project: project.name, error: error.message });
    }
  }

  return results;
}

export default {
  scanCustomProjects,
  syncCustomProjects,
};