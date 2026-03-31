/**
 * ============================================
 * WebfullSec — API: Chat Roteado para N8N
 * POST /api/ai/n8n-chat
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 * Direciona o comando do usuário para o N8N Workflow (Content Agent ou PM Agent)
 * em vez de rodar o LLM localmente.
 */

import { NextResponse } from 'next/server';
import { triggerN8nWebhook, N8N_WORKFLOWS } from '@/lib/n8n';

export async function POST(request) {
  try {
    const { message, conversationId, agentType, projectId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 });
    }

    // Identificar qual Webhook Node será chamado (padrão é o Agent de Conteúdo/Chat)
    const targetWebhook = agentType === 'pm' 
      ? N8N_WORKFLOWS.PM_AGENT 
      : N8N_WORKFLOWS.CONTENT_AGENT;

    console.log(`[N8N Chat Dispatch] Enviando para: ${targetWebhook}`);

    // Chamada disparada para o N8N (Outbound)
    const n8nResponse = await triggerN8nWebhook(targetWebhook, {
      message,
      conversationId: conversationId || Date.now().toString(),
      projectId: projectId || null,
      source: 'webfullsec-chat'
    });

    // O N8N pode retornar { response: "string", actions: [] } diretamente
    // Se ele voltar apenas texto ou formato desconhecido, nós sanitizamos.
    let assistResponse = 'Agente iniciou operação. Sem resposta de texto do N8N.';
    
    if (n8nResponse && typeof n8nResponse === 'object') {
      if (n8nResponse.response) assistResponse = n8nResponse.response;
      else if (n8nResponse.text) assistResponse = n8nResponse.text;
      else assistResponse = JSON.stringify(n8nResponse);
    } else if (typeof n8nResponse === 'string') {
      assistResponse = n8nResponse;
    }

    return NextResponse.json({
      success: true,
      response: assistResponse,
      actions: n8nResponse?.actions || [],
      conversationId: n8nResponse?.conversationId || conversationId
    });

  } catch (error) {
    console.error('[N8N Chat] Erro Roteamento:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Agente N8N Temporariamente Indisponível' 
    }, { status: 503 });
  }
}
