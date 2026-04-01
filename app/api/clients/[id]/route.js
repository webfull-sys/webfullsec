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

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const client = await prisma.crmCliente.findUnique({
      where: { id },
      include: {
        projetos: {
          select: {
            id: true, titulo_projeto: true, status_projeto: true, categoria: true,
            due_date_cliente: true, prioridade: true, resumo_ia_contexto: true,
          },
          orderBy: { atualizado_em: 'desc' },
        },
        _count: { select: { projetos: true } },
      },
    });

    if (!client) return apiError('Cliente CRM não encontrado', 404);
    return apiResponse(client);
  } catch (error) {
    console.error('Erro ao buscar cliente CRM:', error);
    return apiError('Erro interno', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.nome_cliente !== undefined && !body.nome_cliente?.trim()) {
      return apiError('O nome não pode ser vazio', 400);
    }

    const data = {};
    const allowedFields = [
      'nome_cliente', 'email', 'telefone', 'status_cliente', 'nivel_prioridade', 'notas_contexto'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'nivel_prioridade') {
          data[field] = Math.min(5, Math.max(1, parseInt(body[field])));
        } else {
          data[field] = body[field];
        }
      }
    }

    const client = await prisma.crmCliente.update({
      where: { id },
      data,
      include: {
        _count: { select: { projetos: true } },
      },
    });

    return apiResponse(client);
  } catch (error) {
    if (error.code === 'P2025') {
      return apiError('Cliente CRM não encontrado', 404);
    }
    console.error('Erro ao atualizar cliente CRM:', error);
    return apiError('Erro ao atualizar', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.crmCliente.delete({ where: { id } });
    return apiResponse({ message: 'Cliente CRM removido com sucesso' });
  } catch (error) {
    if (error.code === 'P2025') {
      return apiError('Cliente CRM não encontrado', 404);
    }
    console.error('Erro ao deletar cliente CRM:', error);
    return apiError('Erro ao deletar', 500);
  }
}
