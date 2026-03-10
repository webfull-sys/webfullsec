/**
 * ============================================
 * WebfullSec — API: Notificações
 * GET /api/notifications — Listar notificações
 * PATCH /api/notifications — Marcar como lidas
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * GET /api/notifications
 * Query: ?unread=true&limit=20&count=true
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const countOnly = searchParams.get('count') === 'true';

    const where = {};
    if (unreadOnly) where.isRead = false;

    // Se pedir apenas contagem
    if (countOnly) {
      const count = await prisma.notification.count({ where });
      return apiResponse({ count });
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: { isRead: false },
    });

    return apiResponse({ notifications, unreadCount });
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    return apiError('Erro ao listar notificações', 500);
  }
}

/**
 * PATCH /api/notifications
 * Body: { ids?: string[], markAllRead?: boolean }
 */
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { ids, markAllRead } = body;

    if (markAllRead) {
      // Marcar todas como lidas
      await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
    } else if (ids && ids.length > 0) {
      // Marcar IDs específicos como lidos
      await prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { isRead: true },
      });
    }

    return apiResponse({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar notificações:', error);
    return apiError('Erro ao atualizar notificações', 500);
  }
}
