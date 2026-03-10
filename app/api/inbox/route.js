/**
 * ============================================
 * WebfullSec — API: Inbox Universal (CRUD)
 * GET  /api/inbox — Lista itens da inbox
 * POST /api/inbox — Cria novo item na inbox
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.2.0
 * ============================================
 * Funil de captura universal para ideias, emails,
 * mensagens e pensamentos. Suporta processamento
 * automático pela IA e conversão para tarefas/projetos.
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * GET /api/inbox
 * Query params: unreadCount, source, archived, processed, limit
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadCount = searchParams.get('unreadCount');
    const source = searchParams.get('source');
    const archived = searchParams.get('archived') === 'true';
    const processed = searchParams.get('processed');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Retorno rápido para contagem de não lidos
    if (unreadCount === 'true') {
      const count = await prisma.inboxItem.count({
        where: { isRead: false, isArchived: false },
      });
      return apiResponse({ count });
    }

    // Construir filtros
    const where = { isArchived: archived };
    if (source) where.source = source;
    if (processed === 'true') where.processedByAi = true;
    if (processed === 'false') where.processedByAi = false;

    const [items, total, unprocessed] = await Promise.all([
      prisma.inboxItem.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      }),
      prisma.inboxItem.count({ where }),
      // Contar itens não processados pela IA
      prisma.inboxItem.count({
        where: { processedByAi: false, isArchived: false },
      }),
    ]);

    return apiResponse({ items, total, unprocessed });
  } catch (error) {
    console.error('Erro ao listar inbox:', error);
    return apiError('Erro ao listar items da inbox', 500);
  }
}

/**
 * POST /api/inbox
 * Body: { title, content, source, priority, metadata }
 */
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
        metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
      },
    });

    return apiResponse(item, 201);
  } catch (error) {
    console.error('Erro ao criar item inbox:', error);
    return apiError('Erro ao criar item', 500);
  }
}
