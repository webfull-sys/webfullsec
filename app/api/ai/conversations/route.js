/**
 * ============================================
 * WebfullSec — API: Conversas IA
 * GET /api/ai/conversations — Listar conversas
 * POST /api/ai/conversations — Criar conversa
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * GET /api/ai/conversations
 * Query: ?limit=20&active=true
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const activeOnly = searchParams.get('active') === 'true';

    const where = {};
    if (activeOnly) where.isActive = true;

    const conversations = await prisma.aiConversation.findMany({
      where,
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Última mensagem para preview
          select: { content: true, role: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return apiResponse({
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        isActive: c.isActive,
        messageCount: c._count.messages,
        lastMessage: c.messages[0] || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Erro ao listar conversas:', error);
    return apiError('Erro ao listar conversas', 500);
  }
}

/**
 * POST /api/ai/conversations
 * Body: { title?: string }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { title } = body;

    const conversation = await prisma.aiConversation.create({
      data: { title: title?.trim() || 'Nova Conversa' },
    });

    return apiResponse({ conversation }, 201);
  } catch (error) {
    console.error('Erro ao criar conversa:', error);
    return apiError('Erro ao criar conversa', 500);
  }
}
