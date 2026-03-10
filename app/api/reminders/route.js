/**
 * ============================================
 * WebfullSec — API: Lembretes
 * GET /api/reminders — Listar lembretes
 * POST /api/reminders — Criar lembrete
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * GET /api/reminders
 * Query: ?pending=true&limit=20
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pending = searchParams.get('pending') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where = {};
    if (pending) where.isCompleted = false;

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { remindAt: 'asc' },
      take: limit,
    });

    return apiResponse({ reminders });
  } catch (error) {
    console.error('Erro ao listar lembretes:', error);
    return apiError('Erro ao listar lembretes', 500);
  }
}

/**
 * POST /api/reminders
 * Body: { title, description?, remindAt, recurrence? }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, remindAt, recurrence } = body;

    if (!title?.trim()) {
      return apiError('O título é obrigatório', 400);
    }

    if (!remindAt) {
      return apiError('A data do lembrete é obrigatória', 400);
    }

    const reminder = await prisma.reminder.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        remindAt: new Date(remindAt),
        recurrence: recurrence || null,
      },
    });

    return apiResponse({ reminder }, 201);
  } catch (error) {
    console.error('Erro ao criar lembrete:', error);
    return apiError('Erro ao criar lembrete', 500);
  }
}
