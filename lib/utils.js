/**
 * ============================================
 * WebfullSec — Funções Utilitárias
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.2.0
 * ============================================
 * Funções auxiliares para formatação de dados,
 * respostas de API e helpers visuais do sistema.
 */

/**
 * Formata data para exibição em pt-BR
 * @param {Date|string} date - Data a ser formatada
 * @param {object} options - Opções do Intl.DateTimeFormat
 * @returns {string} Data formatada
 */
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options,
    });
  } catch {
    return '—';
  }

/**
 * Formata hora para exibição
 * @param {Date|string} date - Data/hora
 * @returns {string} Hora formatada (HH:mm)
 */
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }

/**
 * Formata data e hora para exibição em pt-BR
 * @param {Date|string} date - Data/hora
 * @returns {string} Data e hora formatadas
 */
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }

/**
 * Formata minutos em texto legível (ex: "2h 30min")
 * @param {number} minutes - Total de minutos
 * @returns {string} Texto formatado
 */
export function formatMinutes(minutes) {
  if (!minutes) return '0min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * Retorna a cor CSS baseada na prioridade
 * @param {number} priority - 1=Baixa, 2=Média, 3=Alta, 4=Urgente
 * @returns {string} Variável CSS
 */
export function getPriorityColor(priority) {
  const colors = {
    1: 'var(--text-secondary)',
    2: 'var(--accent)',
    3: 'var(--warning)',
    4: 'var(--danger)',
  };
  return colors[priority] || 'var(--text-secondary)';
}

/**
 * Retorna o label da prioridade
 * @param {number} priority
 * @returns {string} Label em português
 */
export function getPriorityLabel(priority) {
  const labels = { 1: 'Baixa', 2: 'Média', 3: 'Alta', 4: 'Urgente' };
  return labels[priority] || 'Média';
}

/**
 * Retorna a cor CSS baseada no nível de importância do cliente
 * @param {number} level - 1 a 5
 * @returns {string} Cor hex
 */
export function getImportanceColor(level) {
  const colors = {
    1: '#4a5568',
    2: '#7a8a9e',
    3: '#00e5ff',
    4: '#ffab00',
    5: '#e040fb',
  };
  return colors[level] || '#7a8a9e';
}

/**
 * Retorna o label do nível de importância do cliente
 * @param {number} level - 1 a 5
 * @returns {string} Label em português
 */
export function getImportanceLabel(level) {
  const labels = {
    1: 'Muito Baixa',
    2: 'Baixa',
    3: 'Média',
    4: 'Alta',
    5: 'VIP',
  };
  return labels[level] || 'Média';
}

/**
 * Retorna o label do status da tarefa
 * @param {string} status
 * @returns {string} Label em português
 */
export function getStatusLabel(status) {
  const labels = {
    inbox: 'Inbox',
    todo: 'Para Fazer',
    in_progress: 'Fazendo',
    done: 'Concluída',
    cancelled: 'Cancelada',
  };
  return labels[status] || status;
}

/**
 * Retorna o label da categoria do projeto
 * @param {string} category
 * @returns {string} Label com emoji
 */
export function getCategoryLabel(category) {
  const labels = {
    site: '🌐 Site',
    automation: '⚡ Automação',
    beat: '🎵 Beat',
  };
  return labels[category] || category;
}

/**
 * Retorna o label do status do projeto (aprimorado)
 * @param {string} status
 * @returns {string} Label em português
 */
export function getProjectStatusLabel(status) {
  const labels = {
    backlog: 'Backlog',
    in_progress: 'Em Andamento',
    waiting_client: 'Aguardando Cliente',
    completed: 'Concluído',
    archived: 'Arquivado',
  };
  return labels[status] || status;
}

/**
 * Retorna o label do tipo de memória
 * @param {string} type
 * @returns {string} Label em português
 */
export function getMemoryTypeLabel(type) {
  const labels = {
    progress: '📝 Progresso',
    decision: '⚖️ Decisão',
    blocker: '🚧 Bloqueio',
    milestone: '🏆 Marco',
    note: '📌 Nota',
    ai_summary: '🤖 Resumo IA',
  };
  return labels[type] || type;
}

/**
 * Retorna o label da fonte de inbox
 * @param {string} source
 * @returns {string} Label com emoji
 */
export function getInboxSourceLabel(source) {
  const labels = {
    manual: '✏️ Manual',
    email: '📧 E-mail',
    whatsapp: '💬 WhatsApp',
    telegram: '📱 Telegram',
    webhook: '🔗 Webhook',
    thought: '💡 Pensamento',
    voice: '🎤 Voz',
    ai: '🤖 IA',
  };
  return labels[source] || source;
}

/**
 * Verifica se uma tarefa está atrasada (dueDate passou e não está concluída)
 * @param {object} task - Objeto da tarefa
 * @returns {boolean}
 */
export function isTaskOverdue(task) {
  if (!task.dueDate || task.status === 'done' || task.status === 'cancelled') {
    return false;
  }
  return new Date(task.dueDate) < new Date();
}

/**
 * Calcula dias até o prazo (dueDate)
 * @param {Date|string} dueDate
 * @returns {number} Dias (negativo = atrasado)
 */
export function daysUntilDue(dueDate) {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Gera saudação baseada na hora do dia
 * @returns {string} Saudação
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Verifica se o horário atual está dentro do expediente
 * @param {number} start - Hora de início (padrão: 9)
 * @param {number} end - Hora de fim (padrão: 18)
 * @returns {boolean}
 */
export function isWorkingHours(start = 9, end = 18) {
  const hour = new Date().getHours();
  return hour >= start && hour < end;
}

/**
 * Resposta padronizada de API
 * @param {*} data - Dados de resposta
 * @param {number} status - HTTP status code
 * @returns {Response}
 */
export function apiResponse(data, status = 200) {
  return Response.json(data, { status });
}

/**
 * Resposta de erro padronizada
 * @param {string} message - Mensagem de erro
 * @param {number} status - HTTP status code
 * @returns {Response}
 */
export function apiError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

/**
 * Gera uma cor aleatória no espectro cyan/teal
 * @returns {string} Cor hex
 */
export function generateTaskColor() {
  const colors = [
    '#00e5ff', '#00bcd4', '#26c6da', '#4dd0e1',
    '#00e676', '#69f0ae', '#ffab00', '#ff6e40',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Parse de tags JSON string para array
 * @param {string|null} tagsJson - JSON string de tags
 * @returns {string[]} Array de tags
 */
export function parseTags(tagsJson) {
  if (!tagsJson) return [];
  try {
    return JSON.parse(tagsJson);
  } catch {
    return [];
  }
}

/**
 * Converte array de tags para JSON string
 * @param {string[]} tags - Array de tags
 * @returns {string|null} JSON string ou null
 */
export function stringifyTags(tags) {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return null;
  return JSON.stringify(tags);
}
