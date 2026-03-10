import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const { agentId, message, entityType, entityId } = await request.json();

    if (!agentId || !message) {
      return NextResponse.json(
        { error: 'Agente e mensagem são obrigatórios.' },
        { status: 400 }
      );
    }

    // 1. Busca os dados do agente
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent || !agent.isActive) {
      return NextResponse.json(
        { error: 'Agente não encontrado ou está inativo.' },
        { status: 404 }
      );
    }

    // 2. Transmite a mensagem para o N8N Webhook do agente
    // Caso o agente tenha um webhook próprio, envia para ele.
    // Se não, envia para o Webhook padrão do sistema (como fallback seguro).
    const targetWebhook = agent.webhookUrl || process.env.N8N_WEBHOOK_URL;
    
    if (!targetWebhook) {
      return NextResponse.json(
        { error: 'Webhook do N8N não configurado no Agente nem no .env' },
        { status: 500 }
      );
    }

    const n8nPayload = {
      agent: {
        id: agent.id,
        name: agent.name,
        prompt: agent.systemPrompt,
        model: agent.llmModel
      },
      context: {
        entityType: entityType || 'inbox',
        entityId: entityId || null
      },
      message: message,
      source: 'webfullsec_chat_agent'
    };

    const webhookSecret = process.env.WEBHOOK_API_KEY || 'dev-webhook-key';

    const response = await fetch(targetWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': webhookSecret
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!response.ok) {
      console.error('N8N recusou o webhook:', await response.text());
      return NextResponse.json(
        { error: 'Falha ao processar pelo Assistente Neural (N8N)' },
        { status: 502 }
      );
    }

    // 3. (Opcional) A resposta do N8N pode vir síncrona com o resultado do LLM.
    const resultData = await response.json();
    
    // 4. Salva a interação na Tabela de Memória do Agente (se houver sucesso)
    await prisma.agentInteraction.create({
      data: {
        agentId: agent.id,
        entityType: entityType || 'inbox',
        entityId: entityId || null,
        inputTrigger: message,
        outputResponse: typeof resultData === 'string' ? resultData : JSON.stringify(resultData)
      }
    });

    return NextResponse.json({
      success: true,
      agentName: agent.name,
      reply: resultData
    });

  } catch (error) {
    console.error('Erro no Chat com Agente:', error);
    return NextResponse.json(
      { error: 'Falha interna ao processar com agente.' },
      { status: 500 }
    );
  }
}
