/**
 * ============================================
 * WebfullSec — API: Webhook Inbox (para n8n)
 * POST /api/webhooks/inbox
 * Recebe itens de email, WhatsApp, Telegram
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.2.0
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * POST /api/webhooks/inbox
 * Headers: x-api-key (autenticação)
 * Body: { title, content, source, priority, metadata }
 */
export async function POST(request) {
  try {
    // Verificar API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.WEBHOOK_API_KEY) {
      return apiError('Não autorizado', 401);
    }

    const body = await request.json();
    const { title, content, source, priority, metadata } = body;

    if (!title?.trim()) {
      return apiError('O título é obrigatório', 400);
    }

    // Criar item na inbox universal
    const item = await prisma.inboxItem.create({
      data: {
        title: title.trim(),
        content: content?.trim() || null,
        source: source || 'webhook',
        priority: priority || 2,
        processedByAi: false, // Pendente de processamento
        metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
      },
    });

    return apiResponse({ success: true, id: item.id }, 201);
  } catch (error) {
    console.error('Erro no webhook inbox:', error);
    return apiError('Erro ao processar webhook', 500);
  }
}
