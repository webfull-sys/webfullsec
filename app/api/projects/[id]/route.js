/**
 * ============================================
 * WebfullSec — API: Project Individual
 * GET/PATCH/DELETE /api/projects/[id]
 * Autoria: Webfull (https://webfull.com.br)
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
        client: true,
        tasks: { orderBy: { position: 'asc' }, include: { subtasks: true } },
        memories: { orderBy: { createdAt: 'desc' }, take: 20 },
        sop: true,
      },
    });
    if (!project) return apiError('Projeto não encontrado', 404);
    return apiResponse(project);
  } catch (error) {
    return apiError('Erro interno', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = {};
    const fields = ['title', 'description', 'category', 'status', 'priority', 'wikiContent', 'clientId', 'sopId', 'startDate', 'dueDate'];
    for (const f of fields) {
      if (body[f] !== undefined) {
        if (['startDate', 'dueDate'].includes(f)) {
          data[f] = body[f] ? new Date(body[f]) : null;
        } else {
          data[f] = body[f];
        }
      }
    }
    const project = await prisma.project.update({ where: { id }, data });
    return apiResponse(project);
  } catch (error) {
    if (error.code === 'P2025') return apiError('Projeto não encontrado', 404);
    return apiError('Erro ao atualizar projeto', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return apiResponse({ message: 'Projeto removido' });
  } catch (error) {
    if (error.code === 'P2025') return apiError('Projeto não encontrado', 404);
    return apiError('Erro ao remover projeto', 500);
  }
}
