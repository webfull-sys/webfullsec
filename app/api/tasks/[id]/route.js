/**
 * ============================================
 * WebfullSec — API: Task Individual
 * GET    /api/tasks/[id] — Detalhe da tarefa
 * PATCH  /api/tasks/[id] — Atualiza tarefa
 * DELETE /api/tasks/[id] — Remove tarefa
 * Autoria: Webfull (https://webfull.com.br)
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, title: true, category: true } },
        subtasks: { orderBy: { position: 'asc' } },
      },
    });

    if (!task) return apiError('Tarefa não encontrada', 404);
    return apiResponse(task);
  } catch (error) {
    console.error('Erro ao buscar tarefa:', error);
    return apiError('Erro interno', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validações básicas
    if (body.title !== undefined && !body.title?.trim()) {
      return apiError('O título não pode ser vazio', 400);
    }

    // Preparar dados para atualização
    const data = {};
    const allowedFields = [
      'title', 'description', 'status', 'priority',
      'estimatedTime', 'actualTime', 'doDate', 'dueDate',
      'projectId', 'parentId', 'position', 'completedAt',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (['doDate', 'dueDate', 'completedAt'].includes(field)) {
          data[field] = body[field] ? new Date(body[field]) : null;
        } else {
          data[field] = body[field];
        }
      }
    }

    // Se marcou como done, registrar completedAt
    if (body.status === 'done' && !body.completedAt) {
      data.completedAt = new Date();
    }

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, title: true } },
      },
    });

    return apiResponse(task);
  } catch (error) {
    if (error.code === 'P2025') {
      return apiError('Tarefa não encontrada', 404);
    }
    console.error('Erro ao atualizar tarefa:', error);
    return apiError('Erro ao atualizar tarefa', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.task.delete({ where: { id } });
    return apiResponse({ message: 'Tarefa removida com sucesso' });
  } catch (error) {
    if (error.code === 'P2025') {
      return apiError('Tarefa não encontrada', 404);
    }
    console.error('Erro ao deletar tarefa:', error);
    return apiError('Erro ao deletar tarefa', 500);
  }
}
