/**
 * ============================================
 * WebfullSec — API: Inbox (CRUD)
 * GET  /api/inbox — Lista itens da inbox
 * POST /api/inbox — Cria novo item na inbox
 * Autoria: Webfull (https://webfull.com.br)
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadCount = searchParams.get('unreadCount');
    const source = searchParams.get('source');
    const archived = searchParams.get('archived') === 'true';

    // Retorno rápido para contagem de não lidos
    if (unreadCount === 'true') {
      const count = await prisma.inboxItem.count({
        where: { isRead: false, isArchived: false },
      });
      return apiResponse({ count });
    }

    const where = { isArchived: archived };
    if (source) where.source = source;

    const items = await prisma.inboxItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return apiResponse({ items });
  } catch (error) {
    console.error('Erro ao listar inbox:', error);
    return apiError('Erro ao listar items da inbox', 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, content, source, priority, metadata } = body;

    if (!title?.trim()) {
      return apiError('O título é obrigatório', 400);
    }

    const item = await prisma.inboxItem.create({
      data: {
        title: title.trim(),
        content: content?.trim() || null,
        source: source || 'manual',
        priority: priority || 2,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return apiResponse(item, 201);
  } catch (error) {
    console.error('Erro ao criar item inbox:', error);
    return apiError('Erro ao criar item', 500);
  }
}
