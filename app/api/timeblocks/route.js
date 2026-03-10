/**
 * ============================================
 * WebfullSec — API: TimeBlocks
 * GET  /api/timeblocks — Lista timeblocks
 * POST /api/timeblocks — Cria novo timeblock
 * Autoria: Webfull (https://webfull.com.br)
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const where = {};
    if (start && end) {
      where.startTime = { gte: new Date(start) };
      where.endTime = { lte: new Date(end) };
    }

    const blocks = await prisma.timeBlock.findMany({
      where,
      include: {
        task: { select: { id: true, title: true, priority: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    return apiResponse({ blocks });
  } catch (error) {
    return apiError('Erro ao listar timeblocks', 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, startTime, endTime, color, taskId, isLocked } = body;

    if (!title?.trim() || !startTime || !endTime) {
      return apiError('Título, horário de início e fim são obrigatórios', 400);
    }

    // Validar limites de horário comercial
    const startHour = new Date(startTime).getHours();
    const endHour = new Date(endTime).getHours();
    const workStart = parseInt(process.env.WORK_START_HOUR || '9');
    const workEnd = parseInt(process.env.WORK_END_HOUR || '18');

    if (startHour < workStart || endHour > workEnd) {
      return apiError(
        `TimeBlocks devem estar dentro do horário comercial (${workStart}h-${workEnd}h)`,
        400
      );
    }

    const block = await prisma.timeBlock.create({
      data: {
        title: title.trim(),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        color: color || '#00e5ff',
        taskId: taskId || null,
        isLocked: isLocked || false,
      },
    });

    return apiResponse(block, 201);
  } catch (error) {
    console.error('Erro ao criar timeblock:', error);
    return apiError('Erro ao criar timeblock', 500);
  }
}
