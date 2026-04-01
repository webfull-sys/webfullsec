const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projectId = 'cmnf3mtcs0001zo7891eyh489';

  // Verifica se o projeto existe
  const proj = await prisma.project.findUnique({ where: { id: projectId } });
  if (!proj) {
    console.log('Projeto não encontrado');
    return;
  }

  // Atualizar o contexto geral
  await prisma.project.update({
    where: { id: projectId },
    data: {
      generalContext: 'Sistema autônomo e inteligente operando localmente no desktop (Next.js 14, SQLite) com integração à IA Antigravity.\nO foco atual é o refinamento da UI/UX (Notion-like) e a estabilização das entidades (CrmCliente, AiProjeto, etc) para se alinhar com as automações do N8N.'
    }
  });

  // Criar memórias cronológicas
  const memories = [
    { type: 'milestone', content: 'Iniciada arquitetura base (Next.js 14 + Prisma + SQLite).', date: new Date('2026-03-09T20:30:00Z') },
    { type: 'progress', content: 'Criação do banco de dados unificado com modelos CrmCliente, AiProjeto e BeatProducao para integração N8N.', date: new Date('2026-03-10T14:00:00Z') },
    { type: 'decision', content: 'Decidido padronizar Design System com dark mode premium (glassmorphism, AppShell global).', date: new Date('2026-03-10T15:30:00Z') },
    { type: 'milestone', content: 'Implementada página "Super Agentes" com visual futurista e unificado.', date: new Date('2026-03-11T19:00:00Z') },
    { type: 'ai_summary', content: 'Assistente atualizada para a metodologia "Orchestrator Copilot" (equipe virtual autônoma gerida por prompts e N8N Webhooks).', date: new Date('2026-03-31T20:00:00Z') },
    { type: 'progress', content: 'Ajustados os fluxos de criação de Clientes (migração para CrmCliente) e tarefas (agrupadas por projeto em accordion).', date: new Date('2026-04-01T12:00:00Z') },
    { type: 'progress', content: 'Mecanismo de Cover e Icon (estilo Notion) com upload local habilitado.', date: new Date('2026-04-01T12:30:00Z') },
    { type: 'milestone', content: 'Criada visualização de Contexto e Cronologia "Timeline IA" injetada diretamente no visual do projeto.', date: new Date('2026-04-01T12:50:00Z') },
    { type: 'decision', content: 'Migração da foreign key Project.clientId para apontar nativamente à CrmCliente resolvendo conflitos do dashboard.', date: new Date('2026-04-01T13:16:00Z') },
  ];

  // Limpa memórias anteriores para evitar duplicatas, caso eu ja tenha rodado (opcional, só de log)
  await prisma.memory.deleteMany({ where: { projectId: projectId } });

  // Inserir todas
  for (const mem of memories) {
    await prisma.memory.create({
      data: {
        projectId: projectId,
        type: mem.type,
        content: mem.content,
        createdAt: mem.date
      }
    });
  }

  console.log('Histórico inserido com sucesso!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
