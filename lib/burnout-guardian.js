/**
 * ============================================
 * WebfullSec — Guardião do Burnout
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.3.0
 * ============================================
 * Motor de proteção contra burnout com:
 * - AI Calendar Planner (auto-agendamento inteligente)
 * - Score de Burnout em tempo real (0-100)
 * - Analytics Semanal de produtividade
 *
 * Regras do Planner:
 * - Horário: 09:00–18:00, almoço: 12:00–13:00
 * - Máximo: 420 minutos úteis/dia
 * - Pausas Pomodoro: 10 min a cada 90 min
 * - Overflow: move para amanhã automaticamente
 * - Prioridade: urgentes > prazos hj/amanhã > alta > demais
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';

// ============================================
// Configuração
// ============================================

const WORK_START = 9;  // 09:00
const WORK_END = 18;   // 18:00
const LUNCH_START = 12; // 12:00
const LUNCH_END = 13;   // 13:00
const MAX_WORK_MINUTES = 420; // 7 horas úteis (9h - 1h almoço)
const POMODORO_BREAK = 10;    // 10 min pausa
const FOCUS_BLOCK = 90;       // 90 min antes de cada pausa

// ============================================
// AI Calendar Planner — Planeja o dia
// ============================================

/**
 * Planeja automaticamente o dia usando IA
 * Busca tarefas pendentes, envia ao Gemini e
 * cria TimeBlocks automaticamente.
 * @param {string} targetDate - Data alvo (ISO, default: hoje)
 * @returns {Promise<object>} Plano do dia
 */
export async function planMyDay(targetDate = null) {
  const today = targetDate ? new Date(targetDate) : new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  // 1. Buscar tarefas pendentes (ordenadas por prioridade)
  const pendingTasks = await prisma.task.findMany({
    where: {
      status: { in: ['inbox', 'todo', 'in_progress'] },
    },
    include: {
      project: { select: { id: true, title: true, category: true, dueDate: true } },
    },
    orderBy: [
      { priority: 'desc' },
      { dueDate: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  if (pendingTasks.length === 0) {
    return {
      success: true,
      message: '🎉 Nenhuma tarefa pendente! Dia livre.',
      plan: [],
      burnoutScore: 0,
    };
  }

  // 2. Buscar TimeBlocks fixos já agendados (reuniões, etc)
  const existingBlocks = await prisma.timeBlock.findMany({
    where: {
      startTime: { gte: today, lt: tomorrow },
      isLocked: true,
    },
    orderBy: { startTime: 'asc' },
  });

  // 3. Formatar tarefas para o prompt
  const taskList = pendingTasks.map((t, i) => {
    const dueDateStr = t.dueDate
      ? new Date(t.dueDate).toLocaleDateString('pt-BR')
      : 'Sem prazo';
    const priorityLabels = { 1: 'Baixa', 2: 'Média', 3: 'Alta', 4: 'Urgente' };
    return `${i + 1}. "${t.title}" | Prioridade: ${priorityLabels[t.priority] || 'Média'} | Tempo estimado: ${t.estimatedTime || 30}min | Prazo: ${dueDateStr} | Projeto: ${t.project?.title || 'Sem projeto'} | ID: ${t.id}`;
  }).join('\n');

  // 4. Formatar blocos fixos
  const fixedBlocksStr = existingBlocks.length > 0
    ? existingBlocks.map(b =>
        `- ${new Date(b.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${new Date(b.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}: ${b.title} (FIXO)`
      ).join('\n')
    : 'Nenhum compromisso fixo.';

  // 5. Montar prompt para a IA
  const dateStr = today.toLocaleDateString('pt-BR');
  const prompt = `Você é um AI Calendar Planner avançado. Seu objetivo é organizar as tarefas pendentes do dia e agendá-las, encaixando-as de forma saudável.

Regras Estritas:
1. O horário de trabalho é das ${String(WORK_START).padStart(2, '0')}:00 às ${String(WORK_END).padStart(2, '0')}:00, com 1 hora de almoço às ${String(LUNCH_START).padStart(2, '0')}:00.
2. Você NÃO PODE agendar mais tarefas do que a soma total de minutos disponíveis no dia (${MAX_WORK_MINUTES} minutos úteis).
3. Sempre insira um intervalo de ${POMODORO_BREAK} minutos (Pomodoro Break) a cada ${FOCUS_BLOCK} minutos de trabalho focado.
4. Priorize sempre tarefas com prazos (due_date) para hoje ou amanhã.
5. Respeite os compromissos FIXOS já agendados — não agende nada no mesmo horário.
6. Se as tarefas excederem o limite do horário comercial, mova as de menor prioridade para amanhã imediatamente.

Data de hoje: ${dateStr}

Compromissos fixos já agendados:
${fixedBlocksStr}

Tarefas pendentes:
${taskList}

RESPONDA EXATAMENTE neste formato JSON (sem markdown, sem texto extra):
{
  "plan": [
    {
      "taskId": "id-da-tarefa",
      "title": "título",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "type": "task"
    },
    {
      "taskId": null,
      "title": "☕ Pausa Pomodoro",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "type": "break"
    }
  ],
  "movedToTomorrow": [
    {
      "taskId": "id-da-tarefa",
      "title": "título",
      "reason": "Capacidade do dia excedida"
    }
  ],
  "totalMinutesPlanned": 420,
  "recommendation": "Mensagem motivacional ou alerta de saúde"
}`;

  // 6. Chamar Gemini para planejar
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: process.env.AI_MODEL || 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3, // Baixa temperatura para planos consistentes
      },
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 7. Parse do JSON retornado pela IA
    let aiPlan;
    try {
      aiPlan = JSON.parse(responseText);
    } catch {
      // Tentar extrair JSON de possível markdown
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiPlan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Resposta da IA não é JSON válido');
      }
    }

    // 8. Criar TimeBlocks e atualizar doDate das tarefas
    const createdBlocks = [];
    const dateBase = new Date(today);

    // Limpar timeblocks anteriores não fixos do dia
    await prisma.timeBlock.deleteMany({
      where: {
        startTime: { gte: today, lt: tomorrow },
        isLocked: false,
      },
    });

    for (const item of (aiPlan.plan || [])) {
      // Parsear horários
      const [startH, startM] = item.startTime.split(':').map(Number);
      const [endH, endM] = item.endTime.split(':').map(Number);

      const startTime = new Date(dateBase);
      startTime.setHours(startH, startM, 0, 0);

      const endTime = new Date(dateBase);
      endTime.setHours(endH, endM, 0, 0);

      // Definir cor baseada no tipo
      const color = item.type === 'break' ? '#69f0ae' : '#00e5ff';

      // Criar TimeBlock
      const block = await prisma.timeBlock.create({
        data: {
          title: item.title,
          startTime,
          endTime,
          color,
          taskId: item.taskId || null,
        },
      });
      createdBlocks.push({ ...block, type: item.type });

      // Atualizar doDate da tarefa se for uma tarefa (não pausa)
      if (item.taskId && item.type === 'task') {
        await prisma.task.update({
          where: { id: item.taskId },
          data: {
            doDate: startTime,
            status: 'todo', // Mover do inbox para todo
          },
        });
      }
    }

    // 9. Mover tarefas excedentes para amanhã
    for (const moved of (aiPlan.movedToTomorrow || [])) {
      if (moved.taskId) {
        await prisma.task.update({
          where: { id: moved.taskId },
          data: { doDate: tomorrow },
        });
      }
    }

    // 10. Calcular burnout score e salvar
    const burnoutData = await calculateBurnoutScore();

    return {
      success: true,
      message: `📅 Dia planejado! ${createdBlocks.filter(b => b.type === 'task').length} tarefas agendadas.`,
      plan: createdBlocks,
      movedToTomorrow: aiPlan.movedToTomorrow || [],
      totalMinutesPlanned: aiPlan.totalMinutesPlanned || 0,
      recommendation: aiPlan.recommendation || '',
      burnoutScore: burnoutData.score,
      burnoutLevel: burnoutData.level,
    };
  } catch (error) {
    console.error('Erro no AI Calendar Planner:', error);
    return {
      success: false,
      message: `Erro ao planejar o dia: ${error.message}`,
      plan: [],
    };
  }
}

// ============================================
// Score de Burnout — Cálculo em tempo real
// ============================================

/**
 * Calcula o score de burnout (0-100) baseado em múltiplos fatores
 * @returns {Promise<object>} { score, level, factors, recommendation }
 */
export async function calculateBurnoutScore() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Início da semana (segunda-feira)
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  if (weekStart > today) weekStart.setDate(weekStart.getDate() - 7);

  // Buscar dados em paralelo
  const [
    todayTaskCount,
    todayEstimated,
    overdueTasks,
    weekPomodoros,
    weekDailyLogs,
    recentBurnouts,
    tasksCompletedToday,
  ] = await Promise.all([
    // Tarefas do dia
    prisma.task.count({
      where: {
        doDate: { gte: today, lt: tomorrow },
        status: { not: 'cancelled' },
      },
    }),
    // Carga estimada do dia (minutos)
    prisma.task.aggregate({
      where: {
        doDate: { gte: today, lt: tomorrow },
        status: { notIn: ['done', 'cancelled'] },
      },
      _sum: { estimatedTime: true },
    }),
    // Tarefas atrasadas
    prisma.task.count({
      where: {
        dueDate: { lt: today },
        status: { notIn: ['done', 'cancelled'] },
      },
    }),
    // Pomodoros da semana
    prisma.pomodoroSession.findMany({
      where: {
        startTime: { gte: weekStart },
        type: 'work',
        isCompleted: true,
      },
    }),
    // Logs diários da semana
    prisma.dailyLog.findMany({
      where: { date: { gte: weekStart } },
      orderBy: { date: 'desc' },
    }),
    // Burnout scores dos últimos 7 dias
    prisma.burnoutLog.findMany({
      where: { date: { gte: weekStart } },
      orderBy: { date: 'desc' },
      take: 7,
    }),
    // Tarefas completadas hoje
    prisma.task.count({
      where: {
        completedAt: { gte: today, lt: tomorrow },
        status: 'done',
      },
    }),
  ]);

  // ---- Calcular fatores de risco ----

  const factors = {};
  let totalScore = 0;

  // FATOR 1: Carga do dia vs capacidade (0-40 pts)
  const todayMinutes = todayEstimated._sum.estimatedTime || 0;
  const loadRatio = todayMinutes / MAX_WORK_MINUTES;
  const loadScore = Math.min(40, Math.round(loadRatio * 40));
  factors.dailyLoad = {
    score: loadScore,
    maxScore: 40,
    minutesPlanned: todayMinutes,
    maxMinutes: MAX_WORK_MINUTES,
    description: loadRatio > 1
      ? `⚠️ Dia sobrecarregado: ${todayMinutes}min planejados (máximo: ${MAX_WORK_MINUTES}min)`
      : `Carga: ${todayMinutes}min de ${MAX_WORK_MINUTES}min disponíveis`,
  };
  totalScore += loadScore;

  // FATOR 2: Tarefas atrasadas (0-20 pts)
  const overdueScore = Math.min(20, overdueTasks * 4);
  factors.overdueTasks = {
    score: overdueScore,
    maxScore: 20,
    count: overdueTasks,
    description: overdueTasks > 0
      ? `🚨 ${overdueTasks} tarefa(s) atrasada(s)`
      : '✅ Nenhuma tarefa atrasada',
  };
  totalScore += overdueScore;

  // FATOR 3: Dias consecutivos intensos (0-15 pts)
  const weekMinutes = weekPomodoros.reduce((sum, p) => sum + p.duration, 0);
  const avgDailyMinutes = weekDailyLogs.length > 0
    ? weekDailyLogs.reduce((sum, log) => sum + (log.totalHours * 60), 0) / weekDailyLogs.length
    : weekMinutes / Math.max(1, new Date().getDay() || 7);
  const intenseDayScore = avgDailyMinutes > MAX_WORK_MINUTES ? 15 :
    avgDailyMinutes > MAX_WORK_MINUTES * 0.85 ? 10 :
    avgDailyMinutes > MAX_WORK_MINUTES * 0.7 ? 5 : 0;
  factors.intenseDays = {
    score: intenseDayScore,
    maxScore: 15,
    avgMinutesPerDay: Math.round(avgDailyMinutes),
    description: intenseDayScore >= 10
      ? `⚠️ Média de ${Math.round(avgDailyMinutes)}min/dia esta semana (intenso!)`
      : `Média de ${Math.round(avgDailyMinutes)}min/dia esta semana`,
  };
  totalScore += intenseDayScore;

  // FATOR 4: Horas totais da semana (0-15 pts)
  const weekTotalMinutes = weekMinutes;
  const weekHoursScore = weekTotalMinutes > 2400 ? 15 : // > 40h
    weekTotalMinutes > 2100 ? 10 : // > 35h
    weekTotalMinutes > 1800 ? 5 : 0;  // > 30h
  factors.weeklyHours = {
    score: weekHoursScore,
    maxScore: 15,
    totalMinutes: weekTotalMinutes,
    totalHours: (weekTotalMinutes / 60).toFixed(1),
    description: `${(weekTotalMinutes / 60).toFixed(1)}h trabalhadas esta semana`,
  };
  totalScore += weekHoursScore;

  // FATOR 5: Humor/mood dos DailyLogs (0-10 pts)
  const moods = weekDailyLogs.filter(l => l.mood).map(l => l.mood);
  const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 3;
  const moodScore = avgMood <= 2 ? 10 : avgMood <= 3 ? 5 : 0;
  factors.mood = {
    score: moodScore,
    maxScore: 10,
    avgMood: avgMood.toFixed(1),
    description: avgMood <= 2 ? '😟 Humor baixo esta semana'
      : avgMood <= 3 ? '😐 Humor neutro'
      : '😊 Humor positivo',
  };
  totalScore += moodScore;

  // ---- Determinar nível ----
  const level = totalScore >= 90 ? 'critical'
    : totalScore >= 70 ? 'high'
    : totalScore >= 40 ? 'moderate'
    : 'low';

  // ---- Gerar recomendação ----
  const recommendations = {
    critical: '🔴 ALERTA CRÍTICO: Você está no limite. Cancele/adie tarefas de baixa prioridade e faça uma pausa de 30 minutos AGORA. Considere bloquear a manhã de amanhã para descanso.',
    high: '🟠 ALERTA: Carga de trabalho elevada. Reorganize prioridades e garanta pausas regulares. Considere delegar tarefas ou estender prazos.',
    moderate: '🟡 ATENÇÃO: Ritmo moderado. Continue fazendo pausas Pomodoro e mantenha o equilíbrio. Você está no caminho certo.',
    low: '🟢 TUDO BEM: Carga de trabalho saudável. Continue assim! Boa produtividade com equilíbrio.',
  };

  const burnoutData = {
    score: totalScore,
    level,
    factors,
    recommendation: recommendations[level],
    todayTasks: todayTaskCount,
    tasksCompletedToday,
    overdueTasks,
    weeklyHours: (weekTotalMinutes / 60).toFixed(1),
  };

  // Salvar log diário (upsert — um por dia)
  try {
    await prisma.burnoutLog.upsert({
      where: { date: today },
      update: {
        score: totalScore,
        level,
        workMinutes: todayMinutes,
        tasksCompleted: tasksCompletedToday,
        tasksOverdue: overdueTasks,
        breaksTaken: weekPomodoros.filter(p => p.type === 'break').length,
        factors: JSON.stringify(factors),
        aiRecommendation: recommendations[level],
      },
      create: {
        date: today,
        score: totalScore,
        level,
        workMinutes: todayMinutes,
        tasksCompleted: tasksCompletedToday,
        tasksOverdue: overdueTasks,
        breaksTaken: 0,
        factors: JSON.stringify(factors),
        aiRecommendation: recommendations[level],
      },
    });
  } catch (error) {
    console.error('Erro ao salvar BurnoutLog:', error);
  }

  return burnoutData;
}

// ============================================
// Analytics Semanal
// ============================================

/**
 * Retorna analytics da semana atual
 * @returns {Promise<object>} Dados da semana
 */
export async function getWeeklyAnalytics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Início da semana (segunda-feira)
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  if (weekStart > today) weekStart.setDate(weekStart.getDate() - 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Buscar dados em paralelo
  const [
    weekTasks,
    weekBurnouts,
    weekPomodoros,
    overdueProjects,
  ] = await Promise.all([
    // Tarefas da semana (criadas e/ou com doDate nesta semana)
    prisma.task.findMany({
      where: {
        OR: [
          { doDate: { gte: weekStart, lt: weekEnd } },
          { completedAt: { gte: weekStart, lt: weekEnd } },
        ],
      },
      include: {
        project: { select: { title: true, category: true } },
      },
    }),
    // Burnout logs da semana
    prisma.burnoutLog.findMany({
      where: { date: { gte: weekStart, lt: weekEnd } },
      orderBy: { date: 'asc' },
    }),
    // Pomodoros da semana
    prisma.pomodoroSession.findMany({
      where: {
        startTime: { gte: weekStart, lt: weekEnd },
        isCompleted: true,
      },
    }),
    // Projetos com deadline nesta semana ou passado
    prisma.project.findMany({
      where: {
        dueDate: { lte: weekEnd },
        status: { notIn: ['completed', 'archived'] },
      },
      select: { id: true, title: true, dueDate: true, status: true },
    }),
  ]);

  // Calcular dados por dia da semana
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dailyStats = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayTasks = weekTasks.filter(t => {
      const doDate = t.doDate ? new Date(t.doDate) : null;
      return doDate && doDate >= day && doDate < nextDay;
    });

    const completedTasks = dayTasks.filter(t => t.status === 'done').length;
    const dayPomodoros = weekPomodoros.filter(p => {
      const start = new Date(p.startTime);
      return start >= day && start < nextDay;
    });

    const dayBurnout = weekBurnouts.find(b => {
      const bDate = new Date(b.date);
      return bDate >= day && bDate < nextDay;
    });

    dailyStats.push({
      day: dayNames[day.getDay()],
      date: day.toLocaleDateString('pt-BR'),
      totalTasks: dayTasks.length,
      completedTasks,
      completionRate: dayTasks.length > 0
        ? Math.round((completedTasks / dayTasks.length) * 100)
        : 0,
      workMinutes: dayPomodoros.reduce((sum, p) => sum + p.duration, 0),
      burnoutScore: dayBurnout?.score || null,
    });
  }

  // Totais da semana
  const totalCompleted = weekTasks.filter(t => t.status === 'done').length;
  const totalPlanned = weekTasks.length;
  const totalWorkMinutes = weekPomodoros.reduce((sum, p) => sum + p.duration, 0);
  const avgBurnout = weekBurnouts.length > 0
    ? Math.round(weekBurnouts.reduce((sum, b) => sum + b.score, 0) / weekBurnouts.length)
    : null;

  return {
    success: true,
    period: {
      start: weekStart.toLocaleDateString('pt-BR'),
      end: new Date(weekEnd.getTime() - 1).toLocaleDateString('pt-BR'),
    },
    summary: {
      totalTasks: totalPlanned,
      totalCompleted,
      completionRate: totalPlanned > 0
        ? Math.round((totalCompleted / totalPlanned) * 100)
        : 0,
      totalWorkHours: (totalWorkMinutes / 60).toFixed(1),
      avgBurnoutScore: avgBurnout,
      overdueProjects: overdueProjects.length,
    },
    daily: dailyStats,
    burnoutTrend: weekBurnouts.map(b => ({
      date: new Date(b.date).toLocaleDateString('pt-BR'),
      score: b.score,
      level: b.level,
    })),
    projectsAtRisk: overdueProjects.map(p => ({
      title: p.title,
      dueDate: p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : null,
      status: p.status,
    })),
  };
}
