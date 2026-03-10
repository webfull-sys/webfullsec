/**
 * ============================================
 * WebfullSec — API: Client Individual
 * GET/PATCH/DELETE /api/clients/[id]
 * Autoria: Webfull (https://webfull.com.br)
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          include: { _count: { select: { tasks: true } } },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    if (!client) return apiError('Cliente não encontrado', 404);
    return apiResponse(client);
  } catch (error) {
    return apiError('Erro interno', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = {};
    const fields = ['name', 'email', 'phone', 'company', 'timezone', 'urgencyLevel', 'notes', 'isActive'];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    const client = await prisma.client.update({ where: { id }, data });
    return apiResponse(client);
  } catch (error) {
    if (error.code === 'P2025') return apiError('Cliente não encontrado', 404);
    return apiError('Erro ao atualizar cliente', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.client.delete({ where: { id } });
    return apiResponse({ message: 'Cliente removido' });
  } catch (error) {
    if (error.code === 'P2025') return apiError('Cliente não encontrado', 404);
    return apiError('Erro ao remover cliente', 500);
  }
}
