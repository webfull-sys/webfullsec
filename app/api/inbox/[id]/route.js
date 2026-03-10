/**
 * ============================================
 * WebfullSec — API: Inbox Item Individual
 * GET    /api/inbox/[id] — Detalhe do item
 * PATCH  /api/inbox/[id] — Atualiza / Converte item
 * DELETE /api/inbox/[id] — Remove item
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.2.0
 * ============================================
 * Suporta conversão de item → tarefa ou projeto.
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const item = await prisma.inboxItem.findUnique({ where: { id } });
    if (!item) return apiError('Item não encontrado', 404);
    return apiResponse(item);
  } catch (error) {
    console.error('Erro ao buscar item:', error);
    return apiError('Erro interno', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Ação especial: converter inbox → tarefa
    if (body.convertToTask) {
      const item = await prisma.inboxItem.findUnique({ where: { id } });
      if (!item) return apiError('Item não encontrado', 404);

      // Criar tarefa a partir do item da inbox
      const task = await prisma.task.create({
        data: {
          title: body.convertToTask.title || item.title,
          description: body.convertToTask.description || item.content,
          status: 'todo',
          priority: body.convertToTask.priority || item.priority,
          projectId: body.convertToTask.projectId || null,
          doDate: body.convertToTask.doDate ? new Date(body.convertToTask.doDate) : null,
          dueDate: body.convertToTask.dueDate ? new Date(body.convertToTask.dueDate) : null,
          estimatedTime: body.convertToTask.estimatedTime || null,
        },
      });

      // Marcar item como processado e vinculado
      await prisma.inboxItem.update({
        where: { id },
        data: {
          processedByAi: true,
          convertedToTaskId: task.id,
          isArchived: true,
        },
      });

      return apiResponse({ task, message: 'Item convertido em tarefa' });
    }

    // Ação especial: converter inbox → projeto
    if (body.convertToProject) {
      const item = await prisma.inboxItem.findUnique({ where: { id } });
      if (!item) return apiError('Item não encontrado', 404);

      const project = await prisma.project.create({
        data: {
          title: body.convertToProject.title || item.title,
          description: body.convertToProject.description || item.content,
          category: body.convertToProject.category || 'site',
          clientId: body.convertToProject.clientId || null,
          generalContext: item.content,
        },
      });

      // Marcar item como processado e vinculado
      await prisma.inboxItem.update({
        where: { id },
        data: {
          processedByAi: true,
          convertedToProjectId: project.id,
          isArchived: true,
        },
      });

      return apiResponse({ project, message: 'Item convertido em projeto' });
    }

    // Atualização normal de campos
    const data = {};
    const allowedFields = [
      'title', 'content', 'source', 'priority',
      'isRead', 'isArchived', 'processedByAi', 'aiSummary',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const item = await prisma.inboxItem.update({
      where: { id },
      data,
    });

    return apiResponse(item);
  } catch (error) {
    if (error.code === 'P2025') {
      return apiError('Item não encontrado', 404);
    }
    console.error('Erro ao atualizar item inbox:', error);
    return apiError('Erro ao atualizar item', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.inboxItem.delete({ where: { id } });
    return apiResponse({ message: 'Item removido com sucesso' });
  } catch (error) {
    if (error.code === 'P2025') {
      return apiError('Item não encontrado', 404);
    }
    console.error('Erro ao deletar item inbox:', error);
    return apiError('Erro ao deletar item', 500);
  }
}
