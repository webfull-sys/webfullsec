/**
 * WebfullSec — API: Inbox Individual
 * PATCH /api/inbox/[id] — Atualiza (marcar lido, arquivar)
 * DELETE /api/inbox/[id] — Remove
 * Autoria: Webfull (https://webfull.com.br)
 */
import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = {};
    if (body.isRead !== undefined) data.isRead = body.isRead;
    if (body.isArchived !== undefined) data.isArchived = body.isArchived;
    if (body.priority !== undefined) data.priority = body.priority;
    const item = await prisma.inboxItem.update({ where: { id }, data });
    return apiResponse(item);
  } catch (error) {
    if (error.code === 'P2025') return apiError('Item não encontrado', 404);
    return apiError('Erro ao atualizar', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.inboxItem.delete({ where: { id } });
    return apiResponse({ message: 'Item removido' });
  } catch (error) {
    if (error.code === 'P2025') return apiError('Item não encontrado', 404);
    return apiError('Erro ao remover', 500);
  }
}
