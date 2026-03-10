/**
 * ============================================
 * WebfullSec — API: Projects (CRUD)
 * GET  /api/projects — Lista projetos
 * POST /api/projects — Cria novo projeto
 * Autoria: Webfull (https://webfull.com.br)
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const clientId = searchParams.get('clientId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (clientId) where.clientId = clientId;

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    // Contar tarefas concluídas por projeto
    const projectsWithProgress = await Promise.all(
      projects.map(async (p) => {
        const completedTasks = await prisma.task.count({
          where: { projectId: p.id, status: 'done' },
        });
        return {
          ...p,
          _count: { ...p._count, completedTasks },
        };
      })
    );

    return apiResponse({ projects: projectsWithProgress });
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    return apiError('Erro ao listar projetos', 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, category, priority, clientId, sopId, startDate, dueDate } = body;

    if (!title?.trim()) {
      return apiError('O título do projeto é obrigatório', 400);
    }

    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        category: category || 'site',
        priority: priority || 2,
        clientId: clientId || null,
        sopId: sopId || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    // Se tiver SOP vinculado, criar tarefas automaticamente
    if (sopId) {
      try {
        const sop = await prisma.sopTemplate.findUnique({ where: { id: sopId } });
        if (sop?.steps) {
          const steps = JSON.parse(sop.steps);
          await prisma.task.createMany({
            data: steps.map((step, index) => ({
              title: step.title,
              estimatedTime: step.estimatedTime || null,
              position: index,
              projectId: project.id,
            })),
          });
        }
      } catch {
        // Se falhar ao criar tarefas do SOP, não impede a criação do projeto
        console.warn('Falha ao aplicar SOP ao projeto');
      }
    }

    return apiResponse(project, 201);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    return apiError('Erro ao criar projeto', 500);
  }
}
