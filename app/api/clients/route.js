/**
 * ============================================
 * WebfullSec — API: Clients (CRUD)
 * GET  /api/clients — Lista clientes com filtros
 * POST /api/clients — Cria novo cliente
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.2.0
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * GET /api/clients
 * Query params: active, search, importance, limit
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const search = searchParams.get('search');
    const importance = searchParams.get('importance');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Construir filtros dinamicamente
    const where = {};
    if (active === 'true') where.isActive = true;
    if (importance) where.importanceLevel = parseInt(importance);

    // Busca textual em múltiplos campos
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        projects: {
          select: { id: true, title: true, status: true, category: true, dueDate: true },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        },
        _count: { select: { projects: true } },
      },
      orderBy: [
        { importanceLevel: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: limit,
    });

    return apiResponse({ clients });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    return apiError('Erro ao listar clientes', 500);
  }
}

/**
 * POST /api/clients
 * Body: { name, email, phone, company, website, cpfCnpj, address,
 *         timezone, importanceLevel, tags, notes }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name, email, phone, company, website,
      cpfCnpj, address, timezone, importanceLevel,
      tags, notes,
    } = body;

    if (!name?.trim()) {
      return apiError('O nome do cliente é obrigatório', 400);
    }

    // Validar nível de importância (1-5)
    const level = importanceLevel ? Math.min(5, Math.max(1, parseInt(importanceLevel))) : 3;

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        website: website?.trim() || null,
        cpfCnpj: cpfCnpj?.trim() || null,
        address: address?.trim() || null,
        timezone: timezone || 'America/Sao_Paulo',
        importanceLevel: level,
        tags: tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
        notes: notes?.trim() || null,
      },
    });

    return apiResponse(client, 201);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return apiError('Erro ao criar cliente', 500);
  }
}
