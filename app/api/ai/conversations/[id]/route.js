/**
 * ============================================
 * WebfullSec — API: Detalhes de Conversa IA
 * GET /api/ai/conversations/[id]
 * DELETE /api/ai/conversations/[id]
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * GET /api/ai/conversations/:id
 * Retorna conversa com todas as mensagens
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const conversation = await prisma.aiConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return apiError('Conversa não encontrada', 404);
    }

    return apiResponse({ conversation });
  } catch (error) {
    console.error('Erro ao buscar conversa:', error);
    return apiError('Erro ao buscar conversa', 500);
  }
}

/**
 * DELETE /api/ai/conversations/:id
 * Remove conversa e todas as mensagens (cascade)
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await prisma.aiConversation.delete({
      where: { id },
    });

    return apiResponse({ success: true });
  } catch (error) {
    console.error('Erro ao deletar conversa:', error);
    return apiError('Erro ao deletar conversa', 500);
  }
}
