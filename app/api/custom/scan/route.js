import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { scanCustomPath } from '@/lib/custom-scanner';

export async function POST(request) {
  try {
    const body = await request.json();
    const { path: customPath, options = {} } = body;

    if (!customPath) {
      return NextResponse.json({ error: 'Caminho é obrigatório' }, { status: 400 });
    }

    const projectData = await scanCustomPath(customPath, options);

    const project = await prisma.project.create({
      data: {
        title: projectData.name,
        description: `## Projeto Custom\n\n**Caminho:** ${projectData.path}\n**Tipo:** ${projectData.type}\n**Tecnologias:** ${projectData.techStack.join(', ') || 'Nenhuma'}\n**Arquivos:** ${projectData.files}\n${projectData.gitRepo ? `\n**Git:** ${projectData.gitRepo}` : ''}`,
        category: 'site',
        status: 'in_progress',
        priority: options.priority || 2,
        generalContext: `## Dados Técnicos\n- Tipo: ${projectData.type}\n- Tecnologias: ${projectData.techStack.join(', ') || 'Nenhuma'}\n- Arquivos: ${projectData.files}\n- Última modificação: ${projectData.lastModified}`,
        icon: getIconForType(projectData.type),
        tags: JSON.stringify([projectData.type, ...projectData.techStack]),
      },
    });

    await prisma.projectLink.create({
      data: {
        projectId: project.id,
        localPath: projectData.path,
        gitRepo: projectData.gitRepo,
        techStack: JSON.stringify(projectData.techStack),
        lastSyncAt: new Date(),
      },
    });

    if (options.createAgent) {
      const agent = await prisma.agent.create({
        data: {
          name: `${projectData.name} DevAgent`,
          description: `Especialista no projeto ${projectData.name}`,
          systemPrompt: `Você é o ${projectData.name} DevAgent, desenvolvedor especialista neste projeto.\n\n## Dados do Projeto\n- Tipo: ${projectData.type}\n- Tecnologias: ${projectData.techStack.join(', ')}\n\n## Suas Responsabilidades\n1. Conhecer todo o código do projeto\n2. Criar tarefas de desenvolvimento\n3. Executar automações quando necessário`,
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
    }

    return NextResponse.json({ 
      success: true, 
      projectId: project.id,
      projectData 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  return NextResponse.json({ 
    message: 'Custom Project Scanner API',
    description: 'Cria projetos a partir de qualquer diretório',
    example: {
      path: 'C:\\Users\\LuizFerreira\\MeuProjeto',
      options: {
        name: 'Nome do Projeto',
        priority: 2,
        createAgent: true
      }
    }
  });
}

function getIconForType(type) {
  const icons = {
    nextjs: '▲',
    react: '⚛️',
    nodejs: '🟢',
    wordpress: '🟦',
    php: '🐘',
    python: '🐍',
    go: '🔵',
    rust: '🦀',
  };
  return icons[type] || '📁';
}