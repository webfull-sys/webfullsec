/**
 * ============================================
 * WebfullSec — Motor de IA (Google Gemini)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.3.0
 * ============================================
 * Serviço central do agente IA com:
 * - Integração com Google Gemini via function calling
 * - Injeção de contexto (tarefas, projetos, calendário, burnout)
 * - Processamento de mensagens e execução de ações
 * - Guardião do Burnout integrado
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { AI_TOOLS, executeAction } from '@/lib/ai-actions';
import { calculateBurnoutScore } from '@/lib/burnout-guardian';

// ============================================
// Configuração do cliente Gemini
// ============================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Obtém o modelo Gemini configurado com function calling
 * @returns {object} Instância do modelo
 */
function getModel() {
  const modelName = process.env.AI_MODEL || 'gemini-2.0-flash';

  return genAI.getGenerativeModel({
    model: modelName,
    tools: [{ functionDeclarations: AI_TOOLS }],
  });
}

// ============================================
// System prompt com contexto do usuário
// ============================================

/**
 * Gera o system prompt com dados do sistema em tempo real
 * Inclui burnout score e status dos projetos
 * @returns {Promise<string>} System prompt completo
 */
async function buildSystemPrompt() {
  // Buscar dados de contexto em paralelo para performance
  const [
    taskCount,
    todayTasks,
    activeProjects,
    unreadInbox,
    pendingReminders,
    burnout,
    overdueTasks,
    inboxPending,
  ] = await Promise.all([
    prisma.task.count({ where: { status: { notIn: ['done', 'cancelled'] } } }),
    prisma.task.findMany({
      where: {
        doDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: { notIn: ['done', 'cancelled'] },
      },
      include: { project: { select: { title: true } } },
      orderBy: { priority: 'desc' },
      take: 10,
    }),
    prisma.project.findMany({
      where: { status: { in: ['backlog', 'in_progress', 'waiting_client'] } },
      include: {
        client: { select: { name: true } },
        _count: { select: { tasks: true } },
      },
      take: 10,
    }),
    prisma.inboxItem.count({ where: { isRead: false, isArchived: false } }),
    prisma.reminder.findMany({
      where: { isCompleted: false, remindAt: { lte: new Date() } },
      take: 5,
    }),
    calculateBurnoutScore(),
    prisma.task.count({
      where: { dueDate: { lt: new Date() }, status: { notIn: ['done', 'cancelled'] } },
    }),
    prisma.task.count({ where: { status: 'inbox' } }),
  ]);

  // Formatar dados de contexto
  const todayTasksList = todayTasks.map(
    (t) => `- [${t.priority === 4 ? '🔥 URGENTE' : t.priority === 3 ? '⚠️ Alta' : ''}] "${t.title}" ${t.project ? `(${t.project.title})` : ''} — ${t.estimatedTime || '?'}min`
  ).join('\n');

  const projectsList = activeProjects.map(
    (p) => `- "${p.title}" (${p.client?.name || 'Interno'}) — ${p._count.tasks} tarefas [${p.status}]`
  ).join('\n');

  const remindersList = pendingReminders.map(
    (r) => `- ⏰ "${r.title}": ${r.description || 'Sem descrição'}`
  ).join('\n');

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  // Alerta de burnout
  const burnoutAlert = burnout.score >= 70
    ? `\n\n## 🔴 ALERTA DE BURNOUT (Score: ${burnout.score}/100 — ${burnout.level.toUpperCase()})\n${burnout.recommendation}\n**AÇÃO OBRIGATÓRIA**: Proativamente sugira reduzir a carga e fazer pausas.`
    : burnout.score >= 40
    ? `\n\n## 🟡 Score de Burnout: ${burnout.score}/100 (${burnout.level})\n${burnout.recommendation}`
    : `\n\n## 🟢 Score de Burnout: ${burnout.score}/100 — Tudo saudável!`;

  return `Você é a **Secretária IA** do WebfullSec — assistente pessoal inteligente da agência digital Webfull.

## Quem você é
- Nome: **SecIA** (Secretária Inteligente da Webfull)
- Personalidade: Profissional, eficiente, proativa, acolhedora e PROTETORA da saúde do Luiz
- Idioma: Sempre responda em **Português do Brasil**
- Autoria do sistema: **Webfull** (https://webfull.com.br)

## Seu papel
Você é a secretária executiva digital do Luiz. Você:
1. Gerencia tarefas, projetos e clientes
2. **Planeja o dia automaticamente** (use plan_my_day quando pedirem)
3. **Monitora o burnout** e alerta proativamente
4. Organiza a agenda e calendário
5. Cria lembretes e notificações proativas
6. Monitora prazos e prioridades
7. Registra logs de memória nos projetos ("onde parei")
8. Sugere otimizações de produtividade

## Contexto atual (${greeting} — ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})

### 📋 Tarefas pendentes: ${taskCount} | ⚠️ Atrasadas: ${overdueTasks} | 📥 Inbox: ${inboxPending}
### 🎯 Tarefas de hoje:
${todayTasksList || 'Nenhuma tarefa agendada para hoje.'}

### 📁 Projetos ativos:
${projectsList || 'Nenhum projeto em andamento.'}

### 📬 Inbox não lidos: ${unreadInbox}

### ⏰ Lembretes pendentes:
${remindersList || 'Nenhum lembrete pendente.'}
${burnoutAlert}

## Regras importantes
1. Quando o usuário pedir para CRIAR algo (tarefa, projeto, lembrete), use as ferramentas disponíveis
2. Quando pedirem "organizar meu dia" ou "planejar", use **plan_my_day**
3. Quando perguntarem sobre cansaço/burnout/estresse, use **check_burnout_score**
4. Quando o usuário disser "parei em..." ou "onde eu parei", use **add_memory_log**
5. **Se o burnout score > 70, SEMPRE alerte e sugira descanso antes de qualquer ação**
6. Seja concisa e objetiva nas respostas
7. Use emojis moderadamente para tornar a comunicação mais visual
8. Priorize tarefas urgentes e atrasadas nos relatórios
9. Sempre pergunte se deseja que você execute ações sugeridas`;
}

// ============================================
// Processar mensagem do usuário
// ============================================

/**
 * Processa uma mensagem do usuário e retorna a resposta do agente
 * @param {string} userMessage - Mensagem do usuário
 * @param {string} conversationId - ID da conversa (opcional)
 * @returns {Promise<object>} { response, actions, conversationId }
 */
export async function processMessage(userMessage, conversationId = null) {
  const model = getModel();
  const systemPrompt = await buildSystemPrompt();
  const executedActions = [];

  // Criar ou recuperar conversa
  let conversation;
  if (conversationId) {
    conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20, // Limitar contexto para performance
        },
      },
    });
  }

  if (!conversation) {
    conversation = await prisma.aiConversation.create({
      data: { title: userMessage.substring(0, 60) + (userMessage.length > 60 ? '...' : '') },
    });
  }

  // Salvar mensagem do usuário no banco
  await prisma.aiMessage.create({
    data: {
      role: 'user',
      content: userMessage,
      conversationId: conversation.id,
    },
  });

  // Construir histórico de mensagens para o modelo
  const history = conversation.messages
    ? conversation.messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }))
    : [];

  // Iniciar chat com o modelo
  const chat = model.startChat({
    history,
    systemInstruction: { parts: [{ text: systemPrompt }] },
  });

  // Enviar mensagem e processar resposta
  let result = await chat.sendMessage(userMessage);
  let response = result.response;
  let finalText = '';

  // Loop de function calling — o agente pode chamar múltiplas ferramentas
  let maxIterations = 5; // Limitar para evitar loops infinitos
  while (maxIterations > 0) {
    const candidate = response.candidates?.[0];
    if (!candidate) break;

    const parts = candidate.content?.parts || [];
    let hasFunctionCall = false;

    for (const part of parts) {
      // Se o modelo retornou texto
      if (part.text) {
        finalText += part.text;
      }

      // Se o modelo quer chamar uma ferramenta (ação)
      if (part.functionCall) {
        hasFunctionCall = true;
        const { name, args } = part.functionCall;

        // Executar a ação e registrar no banco
        const actionResult = await executeAction(name, args);
        executedActions.push({
          type: name,
          args,
          result: actionResult,
        });

        // Registrar ação no banco de dados
        await prisma.aiAction.create({
          data: {
            type: name,
            description: `Ação executada: ${name}`,
            payload: JSON.stringify(args),
            result: JSON.stringify(actionResult),
            status: actionResult.success ? 'success' : 'failed',
            triggeredBy: 'ai',
          },
        });

        // Enviar resultado da função de volta ao modelo
        result = await chat.sendMessage([{
          functionResponse: {
            name,
            response: actionResult,
          },
        }]);
        response = result.response;
      }
    }

    // Se não houve function call, terminamos
    if (!hasFunctionCall) break;
    maxIterations--;
  }

  // Extrair texto final
  if (!finalText) {
    finalText = response.text?.() || response.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui processar sua mensagem. Tente novamente.';
  }

  // Salvar resposta do assistente no banco
  await prisma.aiMessage.create({
    data: {
      role: 'assistant',
      content: finalText,
      toolCalls: executedActions.length > 0 ? JSON.stringify(executedActions) : null,
      conversationId: conversation.id,
    },
  });

  // Atualizar título da conversa se for a primeira mensagem
  if (!conversation.messages || conversation.messages.length === 0) {
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: {
        title: userMessage.substring(0, 60) + (userMessage.length > 60 ? '...' : ''),
      },
    });
  }

  return {
    response: finalText,
    actions: executedActions,
    conversationId: conversation.id,
  };
}
