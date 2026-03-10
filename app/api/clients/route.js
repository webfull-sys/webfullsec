/**
 * ============================================
 * WebfullSec — API: Clients (CRUD)
 * GET  /api/clients — Lista clientes
 * POST /api/clients — Cria novo cliente
 * Autoria: Webfull (https://webfull.com.br)
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const search = searchParams.get('search');

    const where = {};
    if (active === 'true') where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        projects: {
          select: { id: true, title: true, status: true, category: true },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        },
        _count: { select: { projects: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return apiResponse({ clients });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    return apiError('Erro ao listar clientes', 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, phone, company, timezone, urgencyLevel, notes } = body;

    if (!name?.trim()) {
      return apiError('O nome do cliente é obrigatório', 400);
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        timezone: timezone || 'America/Sao_Paulo',
        urgencyLevel: urgencyLevel || 1,
        notes: notes?.trim() || null,
      },
    });

    return apiResponse(client, 201);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return apiError('Erro ao criar cliente', 500);
  }
}
