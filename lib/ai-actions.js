/**
 * ============================================
 * WebfullSec — Sistema de Ações do Agente IA
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 * Define as ferramentas (function calling) que o agente
 * pode executar e suas respectivas implementações.
 */

import prisma from '@/lib/prisma';

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
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Lista tarefas com filtros. Use para consultar tarefas existentes, pendentes ou de hoje.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtrar por status: todo, in_progress, done, cancelled' },
        priority: { type: 'integer', description: 'Filtrar por prioridade: 1, 2, 3, 4' },
        today: { type: 'boolean', description: 'Se true, lista apenas tarefas de hoje' },
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
        status: { type: 'string', description: 'Filtrar por status: planning, in_progress, review, completed, archived' },
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
    description: 'Adiciona um item à caixa de entrada (inbox). Use para registrar ideias, solicitações ou anotações rápidas.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título do item' },
        content: { type: 'string', description: 'Conteúdo/detalhes' },
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
];

// ============================================
// Implementações das ações
// ============================================

/** Mapa de funções com implementação de cada ação */
const actionHandlers = {
  /**
   * Cria uma nova tarefa
   */
  async create_task({ title, description, priority, doDate, dueDate, estimatedTime, projectId }) {
    try {
      const task = await prisma.task.create({
        data: {
          title,
          description: description || null,
          priority: priority || 2,
          doDate: doDate ? new Date(doDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedTime: estimatedTime || null,
          projectId: projectId || null,
        },
      });

      // Criar notificação de confirmação
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
  async list_tasks({ status, priority, today, limit = 10 }) {
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
        // Buscar por título parcial
        task = await prisma.task.findFirst({
          where: {
            title: { contains: taskTitle },
            status: { not: 'done' },
          },
        });
      }

      if (!task) {
        return { success: false, message: 'Tarefa não encontrada.' };
      }

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
  async create_project({ title, description, category, priority, clientId }) {
    try {
      const project = await prisma.project.create({
        data: {
          title,
          description: description || null,
          category: category || 'site',
          priority: priority || 2,
          clientId: clientId || null,
          status: 'planning',
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
          client: { select: { name: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      const list = projects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        category: p.category,
        client: p.client?.name || 'Sem cliente',
        totalTasks: p._count.tasks,
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
      const reminder = await prisma.reminder.create({
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
        data: {
          title,
          message: message || null,
          type: type || 'info',
          link: link || null,
        },
      });

      return { success: true, message: `Notificação "${title}" enviada!` };
    } catch (error) {
      return { success: false, message: `Erro ao enviar notificação: ${error.message}` };
    }
  },

  /**
   * Adiciona item à inbox
   */
  async add_inbox_item({ title, content, priority }) {
    try {
      await prisma.inboxItem.create({
        data: {
          title,
          content: content || null,
          priority: priority || 2,
          source: 'ai',
        },
      });

      return { success: true, message: `Item "${title}" adicionado à inbox!` };
    } catch (error) {
      return { success: false, message: `Erro ao adicionar à inbox: ${error.message}` };
    }
  },

  /**
   * Gera resumo diário
   */
  async get_daily_summary() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const [todayTasks, overdueTasks, activeProjects, unreadInbox, reminders] = await Promise.all([
        prisma.task.findMany({
          where: { doDate: { gte: startOfDay, lt: endOfDay } },
          include: { project: { select: { title: true } } },
          orderBy: { priority: 'desc' },
        }),
        prisma.task.findMany({
          where: { dueDate: { lt: startOfDay }, status: { not: 'done' } },
          take: 5,
        }),
        prisma.project.count({ where: { status: 'in_progress' } }),
        prisma.inboxItem.count({ where: { isRead: false } }),
        prisma.reminder.findMany({
          where: { isCompleted: false, remindAt: { lte: endOfDay } },
        }),
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
          tasks: todayTasks.map((t) => ({
            title: t.title,
            status: t.status,
            priority: t.priority,
            project: t.project?.title || null,
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
          where: { title: { contains: query } },
          take: 5,
          select: { id: true, title: true, status: true, priority: true },
        }),
        prisma.project.findMany({
          where: { title: { contains: query } },
          take: 5,
          select: { id: true, title: true, status: true, category: true },
        }),
        prisma.client.findMany({
          where: { name: { contains: query } },
          take: 5,
          select: { id: true, name: true, company: true },
        }),
      ]);

      return {
        success: true,
        results: {
          tasks: tasks.map((t) => ({ ...t, type: 'task' })),
          projects: projects.map((p) => ({ ...p, type: 'project' })),
          clients: clients.map((c) => ({ ...c, type: 'client' })),
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
      const block = await prisma.timeBlock.create({
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
export async function executeAction(actionName, args) {
  const handler = actionHandlers[actionName];

  if (!handler) {
    return { success: false, message: `Ação desconhecida: ${actionName}` };
  }

  try {
    return await handler(args || {});
  } catch (error) {
    console.error(`Erro ao executar ação "${actionName}":`, error);
    return { success: false, message: `Erro interno ao executar ${actionName}: ${error.message}` };
  }
}
