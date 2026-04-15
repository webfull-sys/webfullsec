/**
 * ============================================
 * WebfullSec — Sistema de Ações do Agente IA
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.3.0
 * ============================================
 * Define as ferramentas (function calling) que o agente
 * pode executar e suas respectivas implementações.
 * Inclui: CRUD de tarefas/projetos, Guardião do Burnout,
 * Calendar Planner e Logs de Memória.
 */

import prisma from '@/lib/prisma';
import { planMyDay, calculateBurnoutScore } from '@/lib/burnout-guardian';

// ============================================
// Definições de ferramentas (Function Calling)
// Formato: Google Gemini Function Declarations
// ============================================

export const AI_TOOLS = [
  {
    name: 'create_task',
    description: 'Cria uma nova tarefa no sistema. Use quando o usuário pedir para criar, adicionar ou registrar uma tarefa.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título da tarefa' },
        description: { type: 'string', description: 'Descrição detalhada da tarefa (opcional)' },
        priority: { type: 'integer', description: 'Prioridade: 1=Baixa, 2=Média, 3=Alta, 4=Urgente', enum: [1, 2, 3, 4] },
        doDate: { type: 'string', description: 'Data para executar (formato ISO 8601, ex: 2026-03-10)' },
        dueDate: { type: 'string', description: 'Prazo final (formato ISO 8601)' },
        estimatedTime: { type: 'integer', description: 'Tempo estimado em minutos' },
        projectId: { type: 'string', description: 'ID do projeto vinculado (opcional)' },
        tags: { type: 'string', description: 'Tags JSON array (ex: ["frontend","urgente"])' },
        recurrence: { type: 'string', description: 'Recorrência: daily, weekly, monthly ou null' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Lista tarefas com filtros. Use para consultar tarefas existentes, pendentes, de hoje ou atrasadas.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtrar por status: inbox, todo, in_progress, done, cancelled' },
        priority: { type: 'integer', description: 'Filtrar por prioridade: 1, 2, 3, 4' },
        today: { type: 'boolean', description: 'Se true, lista apenas tarefas de hoje (doDate = hoje)' },
        overdue: { type: 'boolean', description: 'Se true, lista apenas tarefas atrasadas' },
        limit: { type: 'integer', description: 'Quantidade máxima de resultados (padrão: 10)' },
      },
    },
  },
  {
    name: 'complete_task',
    description: 'Marca uma tarefa como concluída. Use quando o usuário disser que terminou uma tarefa.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID da tarefa a ser concluída' },
        taskTitle: { type: 'string', description: 'Título parcial da tarefa para buscar (se não souber o ID)' },
      },
    },
  },
  {
    name: 'create_project',
    description: 'Cria um novo projeto. Use quando o usuário pedir para iniciar ou criar um projeto.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Nome do projeto' },
        description: { type: 'string', description: 'Descrição do projeto' },
        category: { type: 'string', description: 'Categoria: site, automation, beat', enum: ['site', 'automation', 'beat'] },
        priority: { type: 'integer', description: 'Prioridade: 1=Baixa, 2=Média, 3=Alta, 4=Urgente' },
        clientId: { type: 'string', description: 'ID do cliente vinculado (opcional)' },
        generalContext: { type: 'string', description: 'Contexto geral/escopo do projeto' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_projects',
    description: 'Lista projetos com filtros. Use para consultar projetos existentes.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtrar por status: backlog, in_progress, waiting_client, completed, archived' },
        limit: { type: 'integer', description: 'Quantidade máxima (padrão: 10)' },
      },
    },
  },
  {
    name: 'create_reminder',
    description: 'Cria um lembrete. Use quando o usuário pedir para ser lembrado de algo.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título do lembrete' },
        description: { type: 'string', description: 'Descrição adicional' },
        remindAt: { type: 'string', description: 'Data e hora do lembrete (formato ISO 8601)' },
        recurrence: { type: 'string', description: 'Recorrência: daily, weekly, monthly ou null' },
      },
      required: ['title', 'remindAt'],
    },
  },
  {
    name: 'send_notification',
    description: 'Envia uma notificação ao sistema. Use para alertas, avisos ou confirmações.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título da notificação' },
        message: { type: 'string', description: 'Mensagem da notificação' },
        type: { type: 'string', description: 'Tipo: info, warning, success, error, reminder', enum: ['info', 'warning', 'success', 'error', 'reminder'] },
        link: { type: 'string', description: 'Link para entidade relacionada (ex: /tasks)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'add_inbox_item',
    description: 'Adiciona um item à caixa de entrada universal (inbox). Use para registrar ideias, solicitações, pensamentos ou anotações rápidas.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título do item' },
        content: { type: 'string', description: 'Conteúdo/detalhes' },
        source: { type: 'string', description: 'Fonte: manual, thought, voice, ai', enum: ['manual', 'thought', 'voice', 'ai'] },
        priority: { type: 'integer', description: 'Prioridade: 1=Baixa, 2=Média, 3=Alta, 4=Urgente' },
      },
      required: ['title'],
    },
  },
  {
    name: 'get_daily_summary',
    description: 'Gera um resumo completo do dia atual. Use quando o usuário perguntar sobre o estado do dia, agenda, ou quiser um briefing.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'search_everything',
    description: 'Busca global por tarefas, projetos e clientes. Use quando o usuário procurar algo específico.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texto de busca' },
      },
      required: ['query'],
    },
  },
  {
    name: 'schedule_time_block',
    description: 'Cria um bloco de tempo no calendário. Use para agendar períodos de trabalho focado.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título do bloco' },
        startTime: { type: 'string', description: 'Início (ISO 8601)' },
        endTime: { type: 'string', description: 'Fim (ISO 8601)' },
        color: { type: 'string', description: 'Cor hex (padrão: #00e5ff)' },
        taskId: { type: 'string', description: 'ID da tarefa vinculada (opcional)' },
      },
      required: ['title', 'startTime', 'endTime'],
    },
  },

  // ============================================
  // NOVAS FERRAMENTAS — Guardião do Burnout
  // ============================================

  {
    name: 'plan_my_day',
    description: 'Planeja o dia automaticamente usando IA. Organiza tarefas pendentes em TimeBlocks respeitando horário comercial (09:00-18:00), pausas Pomodoro e prevenção de burnout. Use quando o usuário pedir para organizar o dia, planejar a agenda ou perguntar "o que fazer hoje?".',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Data para planejar (ISO 8601, default: hoje)' },
      },
    },
  },
  {
    name: 'check_burnout_score',
    description: 'Consulta o score de burnout atual (0-100). Mostra fatores de risco, recomendações e nível. Use quando o usuário perguntar como está o nível de estresse, cansaço, burnout ou se deve parar.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'add_memory_log',
    description: 'Registra um log de memória ("Onde eu parei?") vinculado a um projeto. Use quando o usuário disser que parou em algo, quando terminar uma sessão de trabalho, ou quando quiser registrar uma decisão ou bloqueio.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Resumo da ação (ex: "Finalizou a bateria do beat, falta mixar o baixo")' },
        type: { type: 'string', description: 'Tipo: progress, decision, blocker, milestone, note', enum: ['progress', 'decision', 'blocker', 'milestone', 'note'] },
        projectId: { type: 'string', description: 'ID do projeto vinculado' },
        taskId: { type: 'string', description: 'ID da tarefa vinculada (opcional)' },
      },
      required: ['content', 'projectId'],
    },
  },
  {
    name: 'delegate_to_agent',
    description: 'Delega uma tarefa complexa, ação sistêmica ou disparo N8N para um Agente/Funcionário específico. Use APENAS QUANDO a tarefa requer habilidades do Agente listado no cargo do Projeto da tela atual.',
    parameters: {
      type: 'object',
      properties: {
        agentName: { type: 'string', description: 'Nome exato do Agente listado no Contexto Visual (ex: SynthIA)' },
        taskDescription: { type: 'string', description: 'Descrição detalhada do que o Agente deve fazer' },
        projectId: { type: 'string', description: 'ID do projeto atual para fornecer contexto ao Agente' },
        urgency: { type: 'string', description: 'Nível de urgência: normal, high, critical', enum: ['normal', 'high', 'critical'] }
      },
      required: ['agentName', 'taskDescription']
    }
  }
];

// ============================================
// Implementações das ações
// ============================================

/** Mapa de funções com implementação de cada ação */
const actionHandlers = {
  /**
   * Cria uma nova tarefa
   */
  async create_task({ title, description, priority, doDate, dueDate, estimatedTime, projectId, tags, recurrence }) {
    try {
      const task = await prisma.task.create({
        data: {
          title,
          description: description || null,
          status: 'inbox', // Entra como inbox primeiro
          priority: priority || 2,
          doDate: doDate ? new Date(doDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedTime: estimatedTime || null,
          projectId: projectId || null,
          tags: tags || null,
          recurrence: recurrence || null,
        },
      });

      await prisma.notification.create({
        data: {
          title: '✅ Tarefa criada',
          message: `"${title}" foi adicionada via IA`,
          type: 'success',
          link: '/tasks',
        },
      });

      return { success: true, message: `Tarefa "${title}" criada com sucesso!`, taskId: task.id };
    } catch (error) {
      return { success: false, message: `Erro ao criar tarefa: ${error.message}` };
    }
  },

  /**
   * Lista tarefas com filtros
   */
  async list_tasks({ status, priority, today, overdue, limit = 10 }) {
    try {
      const where = {};
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (today) {
        where.doDate = {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        };
      }
      if (overdue) {
        where.dueDate = { lt: new Date(new Date().setHours(0, 0, 0, 0)) };
        where.status = { notIn: ['done', 'cancelled'] };
      }

      const tasks = await prisma.task.findMany({
        where,
        include: { project: { select: { title: true } } },
        orderBy: [{ priority: 'desc' }, { doDate: 'asc' }],
        take: limit,
      });

      const list = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        doDate: t.doDate?.toISOString().split('T')[0] || null,
        dueDate: t.dueDate?.toISOString().split('T')[0] || null,
        project: t.project?.title || null,
        estimatedTime: t.estimatedTime,
      }));

      return { success: true, count: list.length, tasks: list };
    } catch (error) {
      return { success: false, message: `Erro ao listar tarefas: ${error.message}` };
    }
  },

  /**
   * Marca tarefa como concluída
   */
  async complete_task({ taskId, taskTitle }) {
    try {
      let task;
      if (taskId) {
        task = await prisma.task.findUnique({ where: { id: taskId } });
      } else if (taskTitle) {
        task = await prisma.task.findFirst({
          where: { title: { contains: taskTitle, mode: 'insensitive' }, status: { not: 'done' } },
        });
      }

      if (!task) return { success: false, message: 'Tarefa não encontrada.' };

      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'done', completedAt: new Date() },
      });

      return { success: true, message: `Tarefa "${task.title}" marcada como concluída! 🎉` };
    } catch (error) {
      return { success: false, message: `Erro ao concluir tarefa: ${error.message}` };
    }
  },

  /**
   * Cria um novo projeto
   */
  async create_project({ title, description, category, priority, clientId, generalContext }) {
    try {
      const project = await prisma.project.create({
        data: {
          title,
          description: description || null,
          category: category || 'site',
          priority: priority || 2,
          clientId: clientId || null,
          generalContext: generalContext || null,
          status: 'backlog', // Sempre inicia como backlog
        },
      });

      // Criar log de memória automático
      await prisma.memory.create({
        data: {
          content: `Projeto "${title}" criado via IA.`,
          type: 'milestone',
          projectId: project.id,
        },
      });

      await prisma.notification.create({
        data: {
          title: '📁 Projeto criado',
          message: `"${title}" foi criado via IA`,
          type: 'success',
          link: `/projects/${project.id}`,
        },
      });

      return { success: true, message: `Projeto "${title}" criado com sucesso!`, projectId: project.id };
    } catch (error) {
      return { success: false, message: `Erro ao criar projeto: ${error.message}` };
    }
  },

  /**
   * Lista projetos
   */
  async list_projects({ status, limit = 10 }) {
    try {
      const where = {};
      if (status) where.status = status;

      const projects = await prisma.project.findMany({
        where,
        include: {
          client: { select: { nome_cliente: true, email: true } },
          _count: { select: { tasks: true, memories: true } },
        },
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        take: limit,
      });

      const list = projects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        category: p.category,
        client: p.client?.nome_cliente || p.client?.email || 'Sem cliente',
        totalTasks: p._count.tasks,
        totalMemories: p._count.memories,
      }));

      return { success: true, count: list.length, projects: list };
    } catch (error) {
      return { success: false, message: `Erro ao listar projetos: ${error.message}` };
    }
  },

  /**
   * Cria um lembrete
   */
  async create_reminder({ title, description, remindAt, recurrence }) {
    try {
      await prisma.reminder.create({
        data: {
          title,
          description: description || null,
          remindAt: new Date(remindAt),
          recurrence: recurrence || null,
        },
      });
      return { success: true, message: `Lembrete "${title}" criado para ${new Date(remindAt).toLocaleString('pt-BR')}!` };
    } catch (error) {
      return { success: false, message: `Erro ao criar lembrete: ${error.message}` };
    }
  },

  /**
   * Envia notificação
   */
  async send_notification({ title, message, type, link }) {
    try {
      await prisma.notification.create({
        data: { title, message: message || null, type: type || 'info', link: link || null },
      });
      return { success: true, message: `Notificação "${title}" enviada!` };
    } catch (error) {
      return { success: false, message: `Erro ao enviar notificação: ${error.message}` };
    }
  },

  /**
   * Adiciona item à inbox universal
   */
  async add_inbox_item({ title, content, source, priority }) {
    try {
      await prisma.inboxItem.create({
        data: {
          title,
          content: content || null,
          priority: priority || 2,
          source: source || 'ai',
        },
      });
      return { success: true, message: `Item "${title}" adicionado à inbox!` };
    } catch (error) {
      return { success: false, message: `Erro ao adicionar à inbox: ${error.message}` };
    }
  },

  /**
   * Gera resumo diário completo
   */
  async get_daily_summary() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const [todayTasks, overdueTasks, activeProjects, unreadInbox, reminders, burnout] = await Promise.all([
        prisma.task.findMany({
          where: { doDate: { gte: startOfDay, lt: endOfDay } },
          include: { project: { select: { title: true } } },
          orderBy: { priority: 'desc' },
        }),
        prisma.task.findMany({
          where: { dueDate: { lt: startOfDay }, status: { notIn: ['done', 'cancelled'] } },
          take: 5,
        }),
        prisma.project.count({ where: { status: { in: ['backlog', 'in_progress', 'waiting_client'] } } }),
        prisma.inboxItem.count({ where: { isRead: false, isArchived: false } }),
        prisma.reminder.findMany({
          where: { isCompleted: false, remindAt: { lte: endOfDay } },
        }),
        calculateBurnoutScore(),
      ]);

      const completed = todayTasks.filter((t) => t.status === 'done').length;
      const totalEstimated = todayTasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0);

      return {
        success: true,
        summary: {
          date: new Date().toLocaleDateString('pt-BR'),
          totalTasks: todayTasks.length,
          completed,
          pending: todayTasks.length - completed,
          overdue: overdueTasks.length,
          estimatedHours: (totalEstimated / 60).toFixed(1),
          activeProjects,
          unreadInbox,
          pendingReminders: reminders.length,
          burnoutScore: burnout.score,
          burnoutLevel: burnout.level,
          burnoutRecommendation: burnout.recommendation,
          tasks: todayTasks.map((t) => ({
            title: t.title,
            status: t.status,
            priority: t.priority,
            project: t.project?.title || null,
            estimatedTime: t.estimatedTime,
          })),
          overdueTasks: overdueTasks.map((t) => ({
            title: t.title,
            dueDate: t.dueDate?.toISOString().split('T')[0],
          })),
        },
      };
    } catch (error) {
      return { success: false, message: `Erro ao gerar resumo: ${error.message}` };
    }
  },

  /**
   * Busca global
   */
  async search_everything({ query }) {
    try {
      const [tasks, projects, clients] = await Promise.all([
        prisma.task.findMany({
          where: { title: { contains: query, mode: 'insensitive' } },
          take: 5,
          select: { id: true, title: true, status: true, priority: true },
        }),
        prisma.project.findMany({
          where: { title: { contains: query, mode: 'insensitive' } },
          take: 5,
          select: { id: true, title: true, status: true, category: true },
        }),
        prisma.crmCliente.findMany({
          where: { nome_cliente: { contains: query, mode: 'insensitive' } },
          take: 5,
          select: { id: true, nome_cliente: true, email: true },
        }),
      ]);

      return {
        success: true,
        results: {
          tasks: tasks.map((t) => ({ ...t, type: 'task' })),
          projects: projects.map((p) => ({ ...p, type: 'project' })),
          clients: clients.map((c) => ({
            id: c.id,
            name: c.nome_cliente,
            company: c.email || null,
            type: 'client',
          })),
          total: tasks.length + projects.length + clients.length,
        },
      };
    } catch (error) {
      return { success: false, message: `Erro na busca: ${error.message}` };
    }
  },

  /**
   * Agenda bloco de tempo no calendário
   */
  async schedule_time_block({ title, startTime, endTime, color, taskId }) {
    try {
      await prisma.timeBlock.create({
        data: {
          title,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          color: color || '#00e5ff',
          taskId: taskId || null,
        },
      });
      return {
        success: true,
        message: `Bloco "${title}" agendado de ${new Date(startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${new Date(endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}!`,
      };
    } catch (error) {
      return { success: false, message: `Erro ao agendar bloco: ${error.message}` };
    }
  },

  // ============================================
  // NOVOS — Guardião do Burnout
  // ============================================

  /**
   * Planeja o dia automaticamente com IA
   */
  async plan_my_day({ date }) {
    try {
      const result = await planMyDay(date || null);

      if (!result.success) {
        return { success: false, message: result.message };
      }

      const taskCount = result.plan ? result.plan.filter(b => b.taskId).length : 0;
      const movedCount = result.movedToTomorrow ? result.movedToTomorrow.length : 0;

      let message = `📅 Dia planejado com sucesso!\n`;
      message += `• ${taskCount} tarefa(s) agendada(s)\n`;
      message += `• ${result.totalMinutesPlanned || 0} minutos planejados\n`;
      if (movedCount > 0) {
        message += `• ⚠️ ${movedCount} tarefa(s) movida(s) para amanhã (capacidade excedida)\n`;
      }
      message += `• 🛡️ Burnout Score: ${result.burnoutScore}/100 (${result.burnoutLevel})\n`;
      if (result.recommendation) {
        message += `\n💡 ${result.recommendation}`;
      }

      return {
        success: true,
        message,
        plan: result.plan,
        burnoutScore: result.burnoutScore,
        burnoutLevel: result.burnoutLevel,
      };
    } catch (error) {
      return { success: false, message: `Erro ao planejar o dia: ${error.message}` };
    }
  },

  /**
   * Consulta score de burnout
   */
  async check_burnout_score() {
    try {
      const result = await calculateBurnoutScore();

      let message = `🛡️ **Score de Burnout: ${result.score}/100** (${result.level.toUpperCase()})\n\n`;
      message += `📊 Fatores de Risco:\n`;

      if (result.factors.dailyLoad) {
        message += `• Carga do Dia: ${result.factors.dailyLoad.score}/${result.factors.dailyLoad.maxScore} — ${result.factors.dailyLoad.description}\n`;
      }
      if (result.factors.overdueTasks) {
        message += `• Atrasados: ${result.factors.overdueTasks.score}/${result.factors.overdueTasks.maxScore} — ${result.factors.overdueTasks.description}\n`;
      }
      if (result.factors.intenseDays) {
        message += `• Intensidade: ${result.factors.intenseDays.score}/${result.factors.intenseDays.maxScore} — ${result.factors.intenseDays.description}\n`;
      }
      if (result.factors.weeklyHours) {
        message += `• Semana: ${result.factors.weeklyHours.score}/${result.factors.weeklyHours.maxScore} — ${result.factors.weeklyHours.description}\n`;
      }
      if (result.factors.mood) {
        message += `• Humor: ${result.factors.mood.score}/${result.factors.mood.maxScore} — ${result.factors.mood.description}\n`;
      }

      message += `\n${result.recommendation}`;

      return { success: true, message, ...result };
    } catch (error) {
      return { success: false, message: `Erro ao calcular burnout: ${error.message}` };
    }
  },

  /**
   * Registra log de memória ("Onde eu parei?")
   */
  async add_memory_log({ content, type, projectId, taskId }) {
    try {
      // Validar que o projeto existe
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, title: true },
      });

      if (!project) {
        return { success: false, message: 'Projeto não encontrado. Verifique o ID.' };
      }

      const memory = await prisma.memory.create({
        data: {
          content,
          type: type || 'progress',
          projectId,
          taskId: taskId || null,
        },
      });

      return {
        success: true,
        message: `📝 Memória registrada no projeto "${project.title}": "${content}"`,
        memoryId: memory.id,
      };
    } catch (error) {
      return { success: false, message: `Erro ao registrar memória: ${error.message}` };
    }
  },

  /**
   * Delega tarefa para um Sub-Agente / Funcionário Especialista
   */
  async delegate_to_agent({ agentName, taskDescription, projectId, urgency }) {
    try {
      // 1. Encontrar o Agente no banco
      const agent = await prisma.agent.findFirst({
        where: { name: { contains: agentName, mode: 'insensitive' }, isActive: true }
      });

      if (!agent) {
        return { success: false, message: `O agente/funcionário "${agentName}" não foi encontrado no RH ou está inativo.` };
      }

      // 2. Tenta acionar via N8N se houver webhookUrl
      if (agent.webhookUrl) {
        try {
          // Usa N8N para tarefas pesadas (Workers Automáticos)
          const response = await fetch(agent.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: agent.id,
              agentName: agent.name,
              task: taskDescription,
              projectId,
              urgency: urgency || 'normal'
            })
          });
          
          if (response.ok) {
            return { 
              success: true, 
              message: `✅ Tarefa ("${taskDescription}") enviada com sucesso para a automação do Agente **${agent.name}** via N8N!` 
            };
          }
        } catch (webhookError) {
          console.error(`Falha ao bater no N8N do Agente ${agent.name}:`, webhookError);
        }
      }

      // 3. Fallback: Se não tem webhook ou falhou N8N, cria uma tarefa designada ao Agente na Inbox / Backlog
      const assignedTask = await prisma.task.create({
        data: {
          title: `[DELEGADO - ${agent.name}] ${taskDescription.substring(0, 50)}...`,
          description: `**Assigned to AI Agent:** ${agent.name}\n**Contexto:** SecIA Delegou via Copilot.\n\n**Tarefa detalhada:**\n${taskDescription}`,
          status: 'inbox',
          priority: urgency === 'critical' ? 4 : urgency === 'high' ? 3 : 2,
          projectId: projectId || null,
          tags: `["AI-Delegated", "${agent.name}"]`
        }
      });

      return { 
        success: true, 
        message: `🤖 O Agente **${agent.name}** foi notificado (Tarefa ID: ${assignedTask.id} criada). Ele atua sem integração N8N no momento, devendo ler o sistema localmente.` 
      };

    } catch (error) {
      return { success: false, message: `Erro ao delegar para ${agentName}: ${error.message}` };
    }
  }
};

// ============================================
// Executor de ações
// ============================================

/**
 * Executa uma ação pelo nome
 * @param {string} actionName - Nome da ação (ex: "create_task")
 * @param {object} args - Argumentos da ação
 * @returns {Promise<object>} Resultado da execução
 */
// ============================================
// LocalWP Actions
// ============================================

const localwpHandlers = {
  list_localwp_sites: async ({}) => {
    const { scanLocalWpSites } = await import('./localwp-scanner');
    const sites = await scanLocalWpSites();
    const summary = sites.map(s => ({
      name: s.name,
      domain: s.domain,
      wpVersion: s.wpVersion,
      theme: s.themeName,
      plugins: s.plugins.length,
      dbType: s.dbType,
    }));
    return {
      success: true,
      sites: summary,
      total: sites.length,
    };
  },

  get_localwp_site: async ({ siteName }) => {
    if (!siteName) {
      return { success: false, message: 'Nome do site é obrigatório' };
    }
    const { getSiteDetails } = await import('./localwp-scanner');
    const site = await getSiteDetails(siteName);
    if (!site) {
      return { success: false, message: `Site "${siteName}" não encontrado` };
    }
    return { success: true, site };
  },

  check_localwp_changes: async ({ siteName }) => {
    const { checkForChanges } = await import('./localwp-watcher');
    const changes = await checkForChanges(siteName || null);
    return { success: true, changes, total: changes.length };
  },

  get_localwp_status: async ({ siteName }) => {
    if (!siteName) {
      return { success: false, message: 'Nome do site é obrigatório' };
    }
    const { getSiteStatus } = await import('./localwp-watcher');
    const status = await getSiteStatus(siteName);
    return status.error ? { success: false, message: status.error } : { success: true, status };
  },

  sync_localwp_project: async ({ siteName }) => {
    const { createProjectAndAgent } = await import('./localwp-projects');
    const result = await createProjectAndAgent(siteName);
    return {
      success: true,
      message: result.isNew 
        ? `Projeto "${siteName}" criado com agente!` 
        : `Projeto "${siteName}" atualizado!`,
      projectId: result.projectId,
      agentId: result.agentId,
      isNew: result.isNew,
    };
  },

  // ========================================================
  // CUSTOM PROJECTS SYNC
  // ========================================================

  scan_custom_projects: async ({}) => {
    const fs = await import('fs');
    const path = await import('path');
    
    const basePath = process.env.CUSTOM_PROJECTS_PATH || 'D:\\VibeCoding\\ProjSitesAI';
    
    if (!fs.existsSync(basePath)) {
      return { success: false, message: 'Pasta não encontrada: ' + basePath };
    }

    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    const projects = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const projectPath = path.join(basePath, entry.name);
      const isValid = fs.existsSync(path.join(projectPath, 'package.json')) ||
                    fs.existsSync(path.join(projectPath, 'composer.json')) ||
                    fs.existsSync(path.join(projectPath, 'wp-config.php'));
      if (isValid) {
        projects.push({ name: entry.name, path: projectPath });
      }
    }

    return { success: true, projects, basePath };
  },

  sync_custom_project: async ({ projectPath }) => {
    if (!projectPath) {
      return { success: false, message: 'Caminho do projeto é obrigatório' };
    }
    
    const { scanCustomPath } = await import('./custom-scanner');
    const projectData = await scanCustomPath(projectPath);
    
    const project = await prisma.project.create({
      data: {
        title: projectData.name,
        description: `## Projeto Custom\n\n**Caminho:** ${projectData.path}\n**Tipo:** ${projectData.type}`,
        category: 'site',
        status: 'in_progress',
        priority: 2,
        generalContext: `## Dados\n- Tipo: ${projectData.type}\n- Tech: ${projectData.techStack.join(', ')}`,
        icon: projectData.type === 'nextjs' ? '▲' : '📁',
        tags: JSON.stringify([projectData.type]),
      },
    });

    const agent = await prisma.agent.create({
      data: {
        name: `${projectData.name} DevAgent`,
        description: `Especialista em ${projectData.name}`,
        systemPrompt: `Você é o ${projectData.name} DevAgent...`,
        llmModel: 'gemini-2.0-flash',
        isActive: true,
      },
    });

    await prisma.projectAgent.create({
      data: { projectId: project.id, agentId: agent.id, role: 'executor' },
    });

    return { success: true, projectId: project.id, name: projectData.name };
  },

  get_custom_projects: async ({}) => {
    const fs = await import('fs');
    const path = await import('path');
    
    const basePath = process.env.CUSTOM_PROJECTS_PATH || 'D:\\VibeCoding\\ProjSitesAI';
    const projects = await prisma.project.findMany({
      where: { description: { contains: basePath } },
      include: { projectAgents: { include: { agent: true } } },
    });

    return { success: true, projects };
  },

  sync_all_localwp: async ({}) => {
    const { createLocalwpProjectsAndAgents } = await import('./localwp-projects');
    const results = await createLocalwpProjectsAndAgents();
    return {
      success: true,
      message: `Sincronizados: ${results.synced?.length || 0} projetos, ${results.created?.length || 0} novos`,
      details: results,
    };
  },

  get_localwp_projects: async ({}) => {
    const { getLocalwpProjectsStatus } = await import('./localwp-projects');
    const status = await getLocalwpProjectsStatus();
    return { success: true, projects: status };
  },

  run_localwp_auto_sync: async ({}) => {
    const { runScheduledSync } = await import('./localwp-auto-sync');
    const result = await runScheduledSync();
    return {
      success: true,
      message: `Sincronizado: ${result.sync?.created?.length || 0} projetos, ${result.tasks?.length || 0} tarefas criadas`,
      details: result,
    };
  },

  check_localwp_auto_changes: async ({}) => {
    const { checkChangesForAllSites } = await import('./localwp-auto-sync');
    const changes = await checkChangesForAllSites();
    return {
      success: true,
      changes,
      total: changes.reduce((acc, c) => acc + c.changes.length, 0),
    };
  },
};

// ============================================
// ProjetosWebfull Actions
// ============================================

const projetoswebfullHandlers = {
  list_projetoswebfull: async ({}) => {
    const { scanProjetosWebfull } = await import('./projetoswebfull-scanner');
    const projects = await scanProjetosWebfull();
    const summary = projects.map(p => ({
      name: p.name,
      type: p.type,
      techStack: p.techStack,
      fileCount: p.fileCount,
      gitRepo: p.gitRepo,
    }));
    return {
      success: true,
      projects: summary,
      total: projects.length,
    };
  },

  get_projeto_webfull: async ({ projectName }) => {
    if (!projectName) {
      return { success: false, message: 'Nome do projeto é obrigatório' };
    }
    const { getProjectDetails } = await import('./projetoswebfull-scanner');
    const project = await getProjectDetails(projectName);
    if (!project) {
      return { success: false, message: `Projeto "${projectName}" não encontrado` };
    }
    return { success: true, project };
  },

  sync_projetoswebfull: async ({}) => {
    const { createProjetosWebfullProjectsAndAgents } = await import('./projetoswebfull-projects');
    const results = await createProjetosWebfullProjectsAndAgents();
    return {
      success: true,
      message: `Sincronizados: ${results.created?.length || 0} novos, ${results.updated?.length || 0} atualizados`,
      details: results,
    };
  },

  sync_projeto_webfull: async ({ projectName }) => {
    if (!projectName) {
      return { success: false, message: 'Nome do projeto é obrigatório' };
    }
    const { createProjectAndAgent } = await import('./projetoswebfull-projects');
    const result = await createProjectAndAgent(projectName);
    return {
      success: true,
      message: result.isNew ? `Projeto "${projectName}" criado` : `Projeto "${projectName}" atualizado`,
      projectId: result.projectId,
      agentId: result.agentId,
      agentCreated: result.agentCreated,
    };
  },

  get_projetoswebfull_status: async ({}) => {
    const { getProjetosWebfullStatus } = await import('./projetoswebfull-projects');
    const status = await getProjetosWebfullStatus();
    return { success: true, projects: status };
  },
};

AI_TOOLS.push(
  {
    name: 'list_localwp_sites',
    description: 'Lista todos os sites WordPress detectados no LocalWP. Útil para ver quais projetos locais você tem.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_localwp_site',
    description: 'Obtém detalhes de um site específico do LocalWP.',
    parameters: {
      type: 'object',
      properties: {
        siteName: { type: 'string', description: 'Nome do site no LocalWP (ex: webfullapp)' },
      },
      required: ['siteName'],
    },
  },
  {
    name: 'check_localwp_changes',
    description: 'Verifica alterações recentes nos sites LocalWP.',
    parameters: {
      type: 'object',
      properties: {
        siteName: { type: 'string', description: 'Nome do site específico (opcional)' },
      },
    },
  },
  {
    name: 'get_localwp_status',
    description: 'Verifica o status online/offline de um site LocalWP.',
    parameters: {
      type: 'object',
      properties: {
        siteName: { type: 'string', description: 'Nome do site no LocalWP' },
      },
      required: ['siteName'],
    },
  },
  {
    name: 'sync_localwp_project',
    description: 'Cria ou atualiza um projeto no WebfullSec para um site LocalWP, incluindo o agente DevAgent.',
    parameters: {
      type: 'object',
      properties: {
        siteName: { type: 'string', description: 'Nome do site no LocalWP' },
      },
      required: ['siteName'],
    },
  },
  {
    name: 'sync_all_localwp',
    description: 'Sincroniza TODOS os sites LocalWP criando projetos e agentes no WebfullSec.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'scan_custom_projects',
    description: 'Escaneia a pasta de projetos customizados (D:\\VibeCoding\\ProjSitesAI).',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'sync_custom_project',
    description: 'Sincroniza um projeto específico para o WebfullSec.',
    parameters: {
      type: 'object',
      properties: {
        projectPath: { type: 'string', description: 'Caminho completo do projeto' },
      },
      required: ['projectPath'],
    },
  },
  {
    name: 'get_custom_projects',
    description: 'Lista os projetos customizados já sincronizados.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
{
    name: 'get_localwp_projects',
    description: 'Lista todos os projetos do LocalWP synchronizados no WebfullSec.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'run_localwp_auto_sync',
    description: 'Executa sincronização automática completa: sincroniza projetos, verifica alterações e cria tarefas.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'check_localwp_auto_changes',
    description: 'Verifica alterações não lidas em todos os sites LocalWP.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_projetoswebfull',
    description: 'Lista todos os projetos detectados em D:\\ProjetosWebfull.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_projeto_webfull',
    description: 'Obtém detalhes de um projeto específico em D:\\ProjetosWebfull.',
    parameters: {
      type: 'object',
      properties: {
        projectName: { type: 'string', description: 'Nome do projeto (pasta)' },
      },
      required: ['projectName'],
    },
  },
  {
    name: 'sync_projetoswebfull',
    description: 'Sincroniza TODOS os projetos de D:\\ProjetosWebfull criando projetos e agentes DevAgent.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'sync_projeto_webfull',
    description: 'Sincroniza um projeto específico de D:\\ProjetosWebfull.',
    parameters: {
      type: 'object',
      properties: {
        projectName: { type: 'string', description: 'Nome do projeto (pasta)' },
      },
      required: ['projectName'],
    },
  },
  {
    name: 'get_projetoswebfull_status',
    description: 'Lista todos os projetos de D:\\ProjetosWebfull sincronizados no WebfullSec.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
);

Object.assign(actionHandlers, localwpHandlers, projetoswebfullHandlers);

export async function executeAction(actionName, args) {
  const handler = actionHandlers[actionName];

  if (!handler) {
    return { success: false, message: `Ação desconhecida: ${actionName}` };
  }

  try {
    return await handler(args || {});
  } catch (error) {
    console.error(`Erro ao executar aç��o "${actionName}":`, error);
    return { success: false, message: `Erro interno ao executar ${actionName}: ${error.message}` };
  }
}
