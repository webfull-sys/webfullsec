/**
 * ============================================
 * WebfullSec — API: Dashboard Stats
 * GET /api/dashboard/stats
 * Retorna métricas completas do dashboard
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.3.0
 * ============================================
 * Métricas aprimoradas com burnout score,
 * carga estimada do dia e analytics.
 */

import prisma from '@/lib/prisma';
import { calculateBurnoutScore } from '@/lib/burnout-guardian';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Consultas em paralelo para performance
    const [
      todayTasks,
      completedToday,
      inProgressTasks,
      overdueTasks,
      inboxPending,
      totalProjects,
      waitingClientProjects,
      activeClients,
      inboxUnread,
      todayEstimated,
      unprocessedInbox,
      burnout,
    ] = await Promise.all([
      // Tarefas do dia (doDate = hoje)
      prisma.task.count({
        where: {
          doDate: { gte: today, lt: tomorrow },
          status: { not: 'cancelled' },
        },
      }),
      // Concluídas hoje
      prisma.task.count({
        where: {
          completedAt: { gte: today, lt: tomorrow },
          status: 'done',
        },
      }),
      // Em progresso (total)
      prisma.task.count({
        where: { status: 'in_progress' },
      }),
      // Atrasadas (dueDate passada e não concluída)
      prisma.task.count({
        where: {
          dueDate: { lt: today },
          status: { notIn: ['done', 'cancelled'] },
        },
      }),
      // Tarefas no inbox (não processadas)
      prisma.task.count({
        where: { status: 'inbox' },
      }),
      // Projetos em andamento
      prisma.project.count({
        where: { status: { in: ['backlog', 'in_progress', 'waiting_client'] } },
      }),
      // Projetos aguardando cliente
      prisma.project.count({
        where: { status: 'waiting_client' },
      }),
      // Clientes ativos
      prisma.client.count({
        where: { isActive: true },
      }),
      // Inbox não lidos
      prisma.inboxItem.count({
        where: { isRead: false, isArchived: false },
      }),
      // Carga estimada do dia em minutos
      prisma.task.aggregate({
        where: {
          doDate: { gte: today, lt: tomorrow },
          status: { notIn: ['done', 'cancelled'] },
        },
        _sum: { estimatedTime: true },
      }),
      // Itens da inbox universal não processados pela IA
      prisma.inboxItem.count({
        where: { processedByAi: false, isArchived: false },
      }),
      // Score de burnout
      calculateBurnoutScore(),
    ]);

    return apiResponse({
      // Tarefas
      todayTasks,
      completedToday,
      inProgressTasks,
      overdueTasks,
      inboxPending,
      // Projetos
      totalProjects,
      waitingClientProjects,
      // Clientes
      activeClients,
      // Inbox
      inboxUnread,
      unprocessedInbox,
      // Carga do dia
      todayEstimatedMinutes: todayEstimated._sum.estimatedTime || 0,
      // Guardião do Burnout
      burnoutScore: burnout.score,
      burnoutLevel: burnout.level,
      burnoutRecommendation: burnout.recommendation,
    });
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    return apiError('Erro interno ao buscar estatísticas', 500);
  }
}
