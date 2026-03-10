/**
 * ============================================
 * WebfullSec — API: Client Individual
 * GET    /api/clients/[id] — Detalhe do cliente
 * PATCH  /api/clients/[id] — Atualiza cliente
 * DELETE /api/clients/[id] — Remove cliente
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.2.0
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
          select: {
            id: true, title: true, status: true, category: true,
            dueDate: true, priority: true, generalContext: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        _count: { select: { projects: true } },
      },
    });

    if (!client) return apiError('Cliente não encontrado', 404);
    return apiResponse(client);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return apiError('Erro interno', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validação de nome se fornecido
    if (body.name !== undefined && !body.name?.trim()) {
      return apiError('O nome não pode ser vazio', 400);
    }

    // Campos permitidos para atualização
    const data = {};
    const allowedFields = [
      'name', 'email', 'phone', 'company', 'website',
      'cpfCnpj', 'address', 'timezone', 'importanceLevel',
      'tags', 'notes', 'avatar', 'isActive',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'importanceLevel') {
          data[field] = Math.min(5, Math.max(1, parseInt(body[field])));
        } else if (field === 'tags') {
          data[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else {
          data[field] = body[field];
        }
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data,
      include: {
        _count: { select: { projects: true } },
      },
    });

    return apiResponse(client);
  } catch (error) {
    if (error.code === 'P2025') {
      return apiError('Cliente não encontrado', 404);
    }
    console.error('Erro ao atualizar cliente:', error);
    return apiError('Erro ao atualizar cliente', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.client.delete({ where: { id } });
    return apiResponse({ message: 'Cliente removido com sucesso' });
  } catch (error) {
    if (error.code === 'P2025') {
      return apiError('Cliente não encontrado', 404);
    }
    console.error('Erro ao deletar cliente:', error);
    return apiError('Erro ao deletar cliente', 500);
  }
}
