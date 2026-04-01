/**
 * ============================================
 * WebfullSec — Ponte N8N (Inbound Webhook)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 * Recebe instruções do N8N de forma segura e 
 * aplica no banco de dados usando o Prisma.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Verifica a chave de segurança para impedir acessos de terceiros
const authMiddleware = (request) => {
  const secret = process.env.WEBHOOK_API_KEY;
  if (!secret) {
    return false;
  }
  
  // O N8N pode mandar pelo header padrão de Authorization ou X-Webfull-Security-Key
  const authHeader = request.headers.get('authorization') || request.headers.get('x-webfull-security-key');
  
  if (!authHeader || authHeader !== secret && authHeader !== `Bearer ${secret}`) {
    return false;
  }
  return true;
};

/**
 * POST /api/webhooks/n8n/action
 * Endpoint de gateway que processa diversas ações baseadas no payload JSON
 */
export async function POST(request) {
  try {
    if (!process.env.WEBHOOK_API_KEY) {
      return NextResponse.json({ success: false, error: 'WEBHOOK_API_KEY não configurada' }, { status: 500 });
    }

    // 1 - Validação de Segurança (Zero-Trust)
    if (!authMiddleware(request)) {
      return NextResponse.json({ success: false, error: 'Acesso Negado: Chave de API inválida' }, { status: 401 });
    }

    const payload = await request.json();
    const { action, data } = payload;

    if (!action || !data) {
      return NextResponse.json({ success: false, error: 'Payload malformado. Faltam action ou data.' }, { status: 400 });
    }

    console.log(`[N8N Inbound] 🤖 Recebida ação: ${action}`, data);

    // 2 - Roteamento de Lógicas do Agente
    let result = null;

    switch (action) {
      // 📝 Criação de Tarefa no Kanban de um projeto (ex: criado pelo PM Agent)
      case 'create_project_task':
        result = await prisma.task.create({
          data: {
            title: data.title,
            description: data.description || '',
            status: data.status || 'todo',
            priority: data.priority || 2,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            projectId: data.projectId
          }
        });
        break;

      // ⚠️ Cria um alerta/memória no projeto e na central de notificações
      case 'create_alert':
        result = await prisma.notification.create({
          data: {
            title: data.title,
            message: data.message,
            type: data.type || 'warning',
            link: data.link || null
          }
        });

        // Caso tenha projectId (ex: Alerta de Burnout naquele projeto)
        if (data.projectId) {
          await prisma.memory.create({
            data: {
              content: `⚠️ [Alerta N8N] ${data.title} - ${data.message}`,
              type: 'ai_summary',
              projectId: data.projectId
            }
          });
        }
        break;

      // 🛠 Modifica o Payload de um Bloco do Projeto (Notion Editor)
      case 'update_project_block':
        // Encontra o último bloco para adicionar a resposta do agente, ou cria um novo "callout"
        result = await prisma.projectBlock.create({
          data: {
            projectId: data.projectId,
            type: 'callout',
            content: `**[${data.agentName || 'Assistente IA'}]**: ${data.content}`,
            position: 999 // Força ir pro fim da página
          }
        });
        break;
        
      // 📥 Captura do 'Intake Agent' -> Cai na Inbox do usuário
      case 'inbox_capture':
        result = await prisma.inboxItem.create({
          data: {
            title: data.title,
            content: data.content,
            source: data.source || 'ai', // ai, voice, email
            priority: data.priority || 2,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          }
        });
        break;

      default:
        // Ação desconhecida
        return NextResponse.json({ success: false, error: `Ação "${action}" não reconhecida pela ponte Inbound.` }, { status: 400 });
    }

    // 3 - Sucesso!
    return NextResponse.json({
      success: true,
      action_processed: action,
      data: result
    }, { status: 200 });

  } catch (error) {
    console.error('[N8N Inbound] Erro Processando Webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
