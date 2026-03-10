/**
 * ============================================
 * WebfullSec — API: AI Calendar Planner
 * POST /api/ai/planner — Gera plano do dia
 * GET  /api/ai/planner — Busca plano existente
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.3.0
 * ============================================
 * Auto-agenda tarefas usando IA, respeitando
 * limites de saúde e prevenindo burnout.
 */

import prisma from '@/lib/prisma';
import { planMyDay } from '@/lib/burnout-guardian';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * POST /api/ai/planner
 * Body: { date?: string } — Data alvo (ISO), default: hoje
 * Gera plano do dia com TimeBlocks automáticos
 */
export async function POST(request) {
  try {
    // Verificar API key do Gemini
    if (!process.env.GEMINI_API_KEY) {
      return apiError('API key do Gemini não configurada', 500);
    }

    const body = await request.json().catch(() => ({}));
    const { date } = body;

    // Executar o planejamento
    const result = await planMyDay(date || null);

    if (!result.success) {
      return apiError(result.message, 500);
    }

    return apiResponse(result);
  } catch (error) {
    console.error('Erro no AI Planner:', error);
    return apiError(`Erro ao gerar plano: ${error.message}`, 500);
  }
}

/**
 * GET /api/ai/planner
 * Query: date (ISO) — Busca plano existente do dia
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    const today = dateStr ? new Date(dateStr) : new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Buscar TimeBlocks do dia
    const timeBlocks = await prisma.timeBlock.findMany({
      where: {
        startTime: { gte: today, lt: tomorrow },
      },
      include: {
        task: {
          select: {
            id: true, title: true, status: true, priority: true,
            estimatedTime: true, dueDate: true, project: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Buscar burnout score do dia
    const burnoutLog = await prisma.burnoutLog.findUnique({
      where: { date: today },
    });

    return apiResponse({
      date: today.toLocaleDateString('pt-BR'),
      timeBlocks,
      burnoutScore: burnoutLog?.score || null,
      burnoutLevel: burnoutLog?.level || null,
      recommendation: burnoutLog?.aiRecommendation || null,
    });
  } catch (error) {
    console.error('Erro ao buscar plano:', error);
    return apiError('Erro ao buscar plano do dia', 500);
  }
}
