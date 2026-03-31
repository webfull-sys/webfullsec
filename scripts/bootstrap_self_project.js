const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function bootstrap() {
  console.log('Iniciando Bootstrap do Projeto WebfullSec e do Agente Desenvolvedor...');

  // 1. Criar ou Atualizar o Agente (O repositório do meu conhecimento)
  const systemPrompt = `Você é o WebfullSec DevAgent, o engenheiro de software e arquiteto do próprio sistema WebfullSec.
Seu papel é ajudar o Luiz a manter, expandir e debugar essa plataforma.

## CONHECIMENTO DA ARQUITETURA
O WebfullSec é um sistema Next.js 14 (App Router) construído pela agência Webfull.
- **Banco de Dados**: PostgreSQL gerenciado pelo Prisma (schema.prisma detalha Client, Project, Task, Agent, Memory, TimeBlock, BurnoutLog e PomodoroSession).
- **Copilot (SecIA)**: O sistema possui um assistente global na rota /api/ai/chat. Ele é o "Orchestrator" (Manager). Ele tem consciência da página atual (currentPath enviada pelo frontend). 
- **RH de Agentes**: O SecIA pode repassar tarefas aos Agentes especialistas vinculados ao projeto usando a tool delegate_to_agent. Se o agente tiver webhookUrl, ele aciona o N8N. Caso contrário, ele cria uma Task [DELEGADO].
- **Segurança**: Operamos com Zero-Trust nos webhooks inbound via WEBHOOK_API_KEY. Webhooks N8N respondem em /api/webhooks/n8n/action.
- **Frontend**: O UI é feito com módulos CSS e o componente AppShell, aderindo a responsividade e Glassmorphism.

Sempre que atuar neste projeto, guie-se pelas melhores práticas de Next.js App Router (Server Actions/API Routes), otimização de React Server Components e Tailwind/CSS Modules.`;

  let agent = await prisma.agent.findFirst({
    where: { name: 'WebfullSec DevAgent' }
  });

  if (agent) {
    console.log('Agente já existe. Atualizando conhecimento...');
    agent = await prisma.agent.update({
      where: { id: agent.id },
      data: { systemPrompt, description: 'Especialista na base de código e arquitetura do próprio WebfullSec.' }
    });
  } else {
    console.log('Criando novo Agente DevAgent...');
    agent = await prisma.agent.create({
      data: {
        name: 'WebfullSec DevAgent',
        description: 'Especialista na base de código e arquitetura do próprio WebfullSec.',
        systemPrompt,
        llmModel: 'gemini-2.0-flash',
        isActive: true
      }
    });
  }

  // 2. Criar o Projeto WebfullSec
  let project = await prisma.project.findFirst({
    where: { title: 'Desenvolvimento WebfullSec' }
  });

  if (!project) {
    console.log('Criando o projeto do WebfullSec...');
    project = await prisma.project.create({
      data: {
        title: 'Desenvolvimento WebfullSec',
        description: 'Projeto de evolução contínua da própria plataforma WebfullSec (O Meta-Projeto).',
        category: 'site',
        priority: 4, // Urgente/Alta
        status: 'in_progress',
        generalContext: 'Este projeto documenta o desenvolvimento, arquitetura e os próximos passos do WebfullSec. O Agente atrelado a ele tem o conhecimento técnico global da base de código.'
      }
    });

    console.log('Vinculando Agente ao Projeto...');
    await prisma.projectAgent.create({
      data: {
        projectId: project.id,
        agentId: agent.id,
        role: 'Arquiteto / FullStack IA'
      }
    });

    console.log('Criando histórico de tarefas/steps...');
    // Criar as tasks do que já fizemos!
    const tasks = [
      { title: 'Configurar Next.js 14 e Prisma (PostgreSQL)', status: 'done', priority: 4, projectId: project.id },
      { title: 'Criar AppShell, Sidebar, Header (Glassmorphism)', status: 'done', priority: 3, projectId: project.id },
      { title: 'Modelo Zero-Trust Inbound Webhooks N8N', status: 'done', priority: 4, projectId: project.id },
      { title: 'Componente Command Bar (PM Agent) nas páginas', status: 'done', priority: 3, projectId: project.id },
      { title: 'Implementar SecIA Orchestrator Copilot e Delegação', status: 'done', priority: 4, projectId: project.id },
      { title: 'Aprimorar Context-Awareness (Visual) p/ IA Global', status: 'done', priority: 4, projectId: project.id },
      { title: 'Testes contínuos em ambiente VPS Coolify', status: 'in_progress', priority: 3, projectId: project.id }
    ];

    await prisma.task.createMany({ data: tasks });
  } else {
    console.log('Projeto já existe. Atualizando contexto...');
    await prisma.project.update({
      where: { id: project.id },
      data: {
        generalContext: 'Este projeto documenta o desenvolvimento, arquitetura e os próximos passos do WebfullSec. O Agente atrelado a ele tem o conhecimento técnico global da base de código atualizado (Copilot).'
      }
    });
  }

  console.log('✅ Tudo Pronto! Projeto meta-criado com sucesso.');
}

bootstrap()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
