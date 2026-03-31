/**
 * ============================================
 * WebfullSec — API: Chat com Agente IA
 * POST /api/ai/chat
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 * Recebe mensagem do usuário, processa com o agente IA
 * e retorna resposta com ações executadas.
 */

import { processMessage } from '@/lib/ai';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * POST /api/ai/chat
 * Body: { message: string, conversationId?: string, currentPath?: string }
 * Retorna: { response, actions, conversationId }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { message, conversationId, currentPath } = body;

    // Validar mensagem
    if (!message?.trim()) {
      return apiError('A mensagem é obrigatória', 400);
    }

    // Verificar se a API key está configurada
    if (!process.env.GEMINI_API_KEY) {
      return apiError('API key do Gemini não configurada. Adicione GEMINI_API_KEY no .env', 500);
    }

    // Processar mensagem com o agente IA passando contexto de página
    const result = await processMessage(message.trim(), conversationId || null, currentPath || null);

    return apiResponse(result);
  } catch (error) {
    console.error('Erro no chat IA:', error);

    // Retornar erro amigável
    return apiError(
      `Erro ao processar mensagem: ${error.message || 'Erro interno do servidor'}`,
      500
    );
  }
}
