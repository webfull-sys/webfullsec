/**
 * ============================================
 * WebfullSec — API: Dashboard Stats
 * GET /api/dashboard/stats
 * Retorna métricas do dashboard
 * Autoria: Webfull (https://webfull.com.br)
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Consultas em paralelo para performance
    const [
      totalTasks,
      completedToday,
      inProgress,
      overdue,
      totalProjects,
      activeClients,
      inboxUnread,
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
      // Em progresso
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
      // Projetos ativos
      prisma.project.count({
        where: { status: { in: ['planning', 'in_progress', 'review'] } },
      }),
      // Clientes ativos
      prisma.client.count({
        where: { isActive: true },
      }),
      // Inbox não lidos
      prisma.inboxItem.count({
        where: { isRead: false, isArchived: false },
      }),
    ]);

    return apiResponse({
      totalTasks,
      completedToday,
      inProgress,
      overdue,
      totalProjects,
      activeClients,
      inboxUnread,
      todayHours: 0, // Placeholder — calculado via PomodoroSessions
    });
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    return apiError('Erro interno ao buscar estatísticas', 500);
  }
}
