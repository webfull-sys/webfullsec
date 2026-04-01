/**
 * ============================================
 * WebfullSec — API: Project Individual
 * GET    /api/projects/[id] — Detalhe completo com blocos, memórias e agentes
 * PATCH  /api/projects/[id] — Atualiza projeto (campos + propriedades Notion)
 * DELETE /api/projects/[id] — Remove projeto e seus blocos
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, nome_cliente: true, nivel_prioridade: true, telefone: true, email: true },
        },
        tasks: {
          orderBy: [{ priority: 'desc' }, { position: 'asc' }],
          select: {
            id: true, title: true, status: true, priority: true,
            estimatedTime: true, doDate: true, dueDate: true, completedAt: true,
          },
        },
        blocks: {
          where: { parentId: null }, // Apenas blocos raiz
          orderBy: { position: 'asc' },
          include: {
            children: {
              orderBy: { position: 'asc' },
            },
          },
        },
        memories: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        projectLink: true,
        projectAgents: {
          include: {
            agent: {
              select: { id: true, name: true, description: true, llmModel: true, isActive: true },
            },
          },
        },
        _count: { select: { tasks: true, memories: true, blocks: true } },
      },
    });

    if (!project) return apiError('Projeto não encontrado', 404);

    // Calcular métricas do projeto
    const completedTasks = project.tasks.filter(t => t.status === 'done').length;
    const overdueTasks = project.tasks.filter(
      t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done' && t.status !== 'cancelled'
    ).length;
    const totalEstimated = project.tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);

    return apiResponse({
      ...project,
      client: project.client ? { 
        ...project.client, 
        name: project.client.nome_cliente,
        importanceLevel: project.client.nivel_prioridade,
        phone: project.client.telefone
      } : null,
      // Parse de tags JSON para array
      tags: project.tags ? JSON.parse(project.tags) : [],
      metrics: {
        completedTasks,
        overdueTasks,
        totalEstimatedMinutes: totalEstimated,
        progress: project.tasks.length > 0
          ? Math.round((completedTasks / project.tasks.length) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    return apiError('Erro interno', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validação de título se fornecido
    if (body.title !== undefined && !body.title?.trim()) {
      return apiError('O título não pode ser vazio', 400);
    }

    // Campos permitidos para atualização
    const data = {};
    const allowedFields = [
      'title', 'description', 'category', 'status', 'priority',
      'generalContext', 'clientId', 'startDate', 'startedAt',
      'dueDate', 'completedAt', 'icon', 'coverImage',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (['startDate', 'startedAt', 'dueDate', 'completedAt'].includes(field)) {
          data[field] = body[field] ? new Date(body[field]) : null;
        } else {
          data[field] = body[field];
        }
      }
    }

    // Tags como JSON string
    if (body.tags !== undefined) {
      data.tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags;
    }

    // Se mudou para in_progress e não tem startedAt, registrar
    if (body.status === 'in_progress') {
      const current = await prisma.project.findUnique({ where: { id }, select: { startedAt: true } });
      if (current && !current.startedAt) {
        data.startedAt = new Date();
      }
    }

    // Se mudou para completed, registrar completedAt
    if (body.status === 'completed' && !body.completedAt) {
      data.completedAt = new Date();
    }

    const project = await prisma.project.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, nome_cliente: true } },
        projectAgents: {
          include: {
            agent: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Criar log de memória para mudanças significativas
    if (body.status || body.generalContext) {
      await prisma.memory.create({
        data: {
          content: body.status
            ? `Status alterado para "${body.status}".`
            : 'Contexto geral atualizado.',
          type: body.status ? 'milestone' : 'progress',
          projectId: id,
        },
      });
    }

    const formattedProject = {
      ...project,
      client: project.client ? { ...project.client, name: project.client.nome_cliente } : null
    };

    return apiResponse(formattedProject);
  } catch (error) {
    if (error.code === 'P2025') {
      return apiError('Projeto não encontrado', 404);
    }
    console.error('Erro ao atualizar projeto:', error);
    return apiError('Erro ao atualizar projeto', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return apiResponse({ message: 'Projeto removido com sucesso' });
  } catch (error) {
    if (error.code === 'P2025') {
      return apiError('Projeto não encontrado', 404);
    }
    console.error('Erro ao deletar projeto:', error);
    return apiError('Erro ao deletar projeto', 500);
  }
}
