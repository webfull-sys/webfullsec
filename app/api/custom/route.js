import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { scanCustomPath } from '@/lib/custom-scanner';

export async function GET(request) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const basePath = process.env.CUSTOM_PROJECTS_PATH || 'D:\\VibeCoding\\ProjSitesAI';
    
    if (!fs.existsSync(basePath)) {
      return NextResponse.json({ projects: [], error: 'Pasta não encontrada: ' + basePath });
    }

    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    const projects = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const projectPath = path.join(basePath, entry.name);
      const isValid = fs.existsSync(path.join(projectPath, 'package.json')) ||
                    fs.existsSync(path.join(projectPath, 'composer.json')) ||
                    fs.existsSync(path.join(projectPath, 'wp-config.php')) ||
                    fs.existsSync(path.join(projectPath, 'requirements.txt'));
      
      if (isValid) {
        projects.push({ name: entry.name, path: projectPath });
      }
    }

    return NextResponse.json({ projects, basePath });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { path: projectPath } = body;

    if (!projectPath) {
      return NextResponse.json({ error: 'Caminho é obrigatório' }, { status: 400 });
    }

    const projectData = await scanCustomPath(projectPath);
    
    const project = await prisma.project.create({
      data: {
        title: projectData.name,
        description: `## Projeto Custom\n\n**Caminho:** ${projectData.path}\n**Tipo:** ${projectData.type}\n**Tecnologias:** ${projectData.techStack.join(', ')}\n**Arquivos:** ${projectData.files}`,
        category: 'site',
        status: 'in_progress',
        priority: 2,
        generalContext: `## Dados Técnicos\n- Tipo: ${projectData.type}\n- Tecnologias: ${projectData.techStack.join(', ')}\n- Arquivos: ${projectData.files}`,
        icon: projectData.type === 'nextjs' ? '▲' : projectData.type === 'react' ? '⚛️' : '📁',
        tags: JSON.stringify([projectData.type, ...projectData.techStack]),
      },
    });

    await prisma.projectLink.create({
      data: {
        projectId: project.id,
        localPath: projectData.path,
        techStack: JSON.stringify(projectData.techStack),
        lastSyncAt: new Date(),
      },
    });

    let agentId = null;
    if (body.createAgent !== false) {
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
          projectId: project.id,
          agentId: agent.id,
          role: 'executor',
        },
      });
      agentId = agent.id;
    }

    return NextResponse.json({ 
      success: true, 
      projectId: project.id,
      agentId,
      projectData 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}