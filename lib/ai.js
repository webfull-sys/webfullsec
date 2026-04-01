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
 * Agora inclui contexto visual (currentPath)
 * @returns {Promise<string>} System prompt completo
 */
async function buildSystemPrompt(currentPath = null) {
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
        client: { select: { nome_cliente: true, email: true } },
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

  // Contexto da Página Atual (Page Aware Copilot)
  let pageContext = `\n## Contexto Visual (Page Aware)\nO usuário não especificou uma página. Ele pode estar no Dashboard (/).`;
  if (currentPath) {
    pageContext = `\n## Contexto Visual (Page Aware)\nO usuário está olhando a tela: **${currentPath}**.\nSe ele pedir algo usando pronomes como "isso", "esse projeto", ele se refere aos dados desta tela.`;
    
    // Se ele está em um Projeto específico:
    const projectMatch = currentPath.match(/\/projects\/(c[a-z0-9]+)/);
    if (projectMatch && projectMatch[1]) {
      const pId = projectMatch[1];
      const proj = await prisma.project.findUnique({
        where: { id: pId },
        include: { 
          tasks: { where: { status: { not: 'done' } }, take: 5 },
          projectAgents: { include: { agent: true } }
        }
      });
      if (proj) {
        pageContext += `\n\n### Dados do Projeto na Tela:\n`;
        pageContext += `- ID: ${proj.id}\n- Título: ${proj.title}\n- Status: ${proj.status}\n`;
        
        if (proj.tasks.length > 0) {
          pageContext += `- Tarefas Visíveis: ${proj.tasks.map(t => t.title).join(', ')}\n`;
        } else {
          pageContext += `- Sem tarefas visíveis.\n`;
        }

        if (proj.projectAgents.length > 0) {
          pageContext += `\n### 👥 RH / Funcionários Disponíveis neste Projeto:\nVocê como Orchestrator tem subordinados/agentes atrelados a essa tarefa que você pode acionar!\n`;
          proj.projectAgents.forEach(pa => {
            pageContext += `- Agente: **${pa.agent.name}** (Especialidade: ${pa.agent.description || 'Padrão'})\n`;
          });
          pageContext += `\n**IMPORTANTE:** Quando o usuário pedir para fazer algo técnico na plataforma, você PODE usar a ferramenta 'delegate_to_agent' para repassar o trabalho se tiver um Agente apropriado vinculado ao projeto.`;
        } else {
          pageContext += `\n- Não há "Super Agentes" (Funcionários IA) vinculados a este projeto específico.`;
        }
      }
    }
  }

  // Formatar dados de contexto genérico
  const todayTasksList = todayTasks.map(
    (t) => `- [${t.priority === 4 ? '🔥 URGENTE' : t.priority === 3 ? '⚠️ Alta' : ''}] "${t.title}" ${t.project ? `(${t.project.title})` : ''} — ${t.estimatedTime || '?'}min`
  ).join('\n');

  const projectsList = activeProjects.map((p) => {
    const clientName = p.client?.nome_cliente || p.client?.email || 'Interno';
    return `- "${p.title}" (${clientName}) — ${p._count.tasks} tarefas [${p.status}]`;
  }).join('\n');

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

  return `Você é a **Secretária IA** do WebfullSec — Uma Copilot de Sistema ("OpenClaw/Claude Cowork" pattern).

## Quem você é
- Nome: **SecIA** (Secretária Inteligente da Webfull, CEO do RH da plataforma)
- Personalidade: Você não roda em nuvem, você está "dentro" do computador do Luiz. Se comporta como uma parceira de trabalho.
- Idioma: Sempre responda em **Português do Brasil**
- Autoria do sistema: **Webfull** (https://webfull.com.br)

## Seu papel
Você é a orquestradora (Orchestrator). Você:
1. Trabalha em conjunto com o usuário na tela que ele está olhando (veja "Contexto Visual").
2. Lê o banco de dados via Function Calling.
3. Se o Luiz pedir coisas pesadas na automação, você verifica os **Funcionários (Super Agentes)** disponíveis na tela (projeto atual) e **delega a tarefa** para eles usando N8N Webhooks (Use a tool delegate_to_agent).
4. Monitora burnout e planeja dias (plan_my_day).

${pageContext}

## Contexto global (${greeting} — ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})

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
1. Quando o usuário disser "faça isso", "ajude nesse projeto", use as infos da variável Contexto Visual.
2. Delegate! Se um Agente Especialista estiver listado no RH local, mande a tarefa pra ele via ferramenta. Você é a Gestora.
3. Quando pedirem "organizar meu dia", use **plan_my_day**
4. Mantenha as respostas focadas. Não deivex um texto gigante a não ser que o Luiz te pergunte algo discursivo.`;
}

// ============================================
// Processar mensagem do usuário
// ============================================

/**
 * Processa uma mensagem do usuário e retorna a resposta do agente
 * @param {string} userMessage - Mensagem do usuário
 * @param {string} conversationId - ID da conversa (opcional)
 * @param {string} currentPath - URL onde o usuário está navegando
 * @returns {Promise<object>} { response, actions, conversationId }
 */
export async function processMessage(userMessage, conversationId = null, currentPath = null) {
  const model = getModel();
  const systemPrompt = await buildSystemPrompt(currentPath);
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
