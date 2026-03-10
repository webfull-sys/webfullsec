/**
 * ============================================
 * WebfullSec — API: Projects (CRUD)
 * GET  /api/projects — Lista projetos com filtros
 * POST /api/projects — Cria novo projeto
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.2.0
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * GET /api/projects
 * Query params: status, category, clientId, limit
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const clientId = searchParams.get('clientId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Construir filtros
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (clientId) where.clientId = clientId;

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, importanceLevel: true } },
        _count: { select: { tasks: true, memories: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: limit,
    });

    // Contar tarefas concluídas e calcular progresso por projeto
    const projectsWithProgress = await Promise.all(
      projects.map(async (p) => {
        const [completedTasks, totalEstimated, overdueCount] = await Promise.all([
          // Tarefas concluídas
          prisma.task.count({
            where: { projectId: p.id, status: 'done' },
          }),
          // Total de tempo estimado (minutos)
          prisma.task.aggregate({
            where: { projectId: p.id, status: { not: 'cancelled' } },
            _sum: { estimatedTime: true },
          }),
          // Tarefas atrasadas
          prisma.task.count({
            where: {
              projectId: p.id,
              dueDate: { lt: new Date() },
              status: { notIn: ['done', 'cancelled'] },
            },
          }),
        ]);

        return {
          ...p,
          _count: {
            ...p._count,
            completedTasks,
            overdueTasks: overdueCount,
          },
          totalEstimatedMinutes: totalEstimated._sum.estimatedTime || 0,
          progress: p._count.tasks > 0
            ? Math.round((completedTasks / p._count.tasks) * 100)
            : 0,
        };
      })
    );

    return apiResponse({ projects: projectsWithProgress });
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    return apiError('Erro ao listar projetos', 500);
  }
}

/**
 * POST /api/projects
 * Body: { title, description, category, priority, clientId,
 *         generalContext, startDate, dueDate }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title, description, category, priority,
      clientId, generalContext, startDate, dueDate,
    } = body;

    if (!title?.trim()) {
      return apiError('O título do projeto é obrigatório', 400);
    }

    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        category: category || 'site',
        status: 'backlog', // Sempre inicia como backlog
        priority: priority || 2,
        clientId: clientId || null,
        generalContext: generalContext?.trim() || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    // Criar log de memória automático
    await prisma.memory.create({
      data: {
        content: `Projeto "${project.title}" criado na categoria ${category || 'site'}.`,
        type: 'milestone',
        projectId: project.id,
      },
    });

    return apiResponse(project, 201);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    return apiError('Erro ao criar projeto', 500);
  }
}
