/**
 * ============================================
 * WebfullSec — Motor de IA (Google Gemini)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 * Serviço central do agente IA com:
 * - Integração com Google Gemini via function calling
 * - Injeção de contexto (tarefas, projetos, calendário)
 * - Processamento de mensagens e execução de ações
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { AI_TOOLS, executeAction } from '@/lib/ai-actions';

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
  ] = await Promise.all([
    prisma.task.count({ where: { status: { not: 'done' } } }),
    prisma.task.findMany({
      where: {
        doDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: { not: 'done' },
      },
      include: { project: { select: { title: true } } },
      orderBy: { priority: 'desc' },
      take: 10,
    }),
    prisma.project.findMany({
      where: { status: 'in_progress' },
      include: {
        client: { select: { name: true } },
        _count: { select: { tasks: true } },
      },
      take: 10,
    }),
    prisma.inboxItem.count({ where: { isRead: false } }),
    prisma.reminder.findMany({
      where: { isCompleted: false, remindAt: { lte: new Date() } },
      take: 5,
    }),
  ]);

  // Formatar dados de contexto
  const todayTasksList = todayTasks.map(
    (t) => `- [${t.priority === 4 ? '🔥 URGENTE' : t.priority === 3 ? '⚠️ Alta' : ''}] "${t.title}" ${t.project ? `(Projeto: ${t.project.title})` : ''}`
  ).join('\n');

  const projectsList = activeProjects.map(
    (p) => `- "${p.title}" (Cliente: ${p.client?.name || 'Interno'}) — ${p._count.tasks} tarefas`
  ).join('\n');

  const remindersList = pendingReminders.map(
    (r) => `- ⏰ "${r.title}": ${r.description || 'Sem descrição'}`
  ).join('\n');

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return `Você é a **Secretária IA** do WebfullSec — assistente pessoal inteligente da agência digital Webfull.

## Quem você é
- Nome: **SecIA** (Secretária Inteligente da Webfull)
- Personalidade: Profissional, eficiente, proativa e amigável
- Idioma: Sempre responda em **Português do Brasil**
- Autoria do sistema: **Webfull** (https://webfull.com.br)

## Seu papel
Você é a secretária executiva digital do Luiz. Você:
1. Gerencia tarefas, projetos e clientes
2. Organiza a agenda e calendário
3. Cria lembretes e notificações proativas
4. Monitora prazos e prioridades
5. Sugere otimizações de produtividade
6. Responde perguntas sobre o estado dos projetos

## Contexto atual (${greeting} — ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})

### 📋 Tarefas pendentes: ${taskCount}
### 🎯 Tarefas de hoje:
${todayTasksList || 'Nenhuma tarefa agendada para hoje.'}

### 📁 Projetos ativos:
${projectsList || 'Nenhum projeto em andamento.'}

### 📬 Inbox não lidos: ${unreadInbox}

### ⏰ Lembretes pendentes:
${remindersList || 'Nenhum lembrete pendente.'}

## Regras importantes
1. Quando o usuário pedir para CRIAR algo (tarefa, projeto, lembrete), use as ferramentas disponíveis para executar
2. Quando pedir informações, consulte os dados do contexto acima
3. Seja concisa e objetiva nas respostas
4. Use emojis moderadamente para tornar a comunicação mais visual
5. Quando sugerir ações, pergunte se deseja que você execute
6. Mantenha o tom profissional mas acolhedor
7. Priorize tarefas urgentes e atrasadas nos relatórios`;
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
