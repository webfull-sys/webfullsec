/**
 * ============================================
 * WebfullSec — Funções Utilitárias
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 */

/**
 * Formata data para exibição em pt-BR
 * @param {Date|string} date - Data a ser formatada
 * @param {object} options - Opções do Intl.DateTimeFormat
 * @returns {string} Data formatada
 */
export function formatDate(date, options = {}) {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  });
}

/**
 * Formata hora para exibição
 * @param {Date|string} date - Data/hora
 * @returns {string} Hora formatada (HH:mm)
 */
export function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
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
 * Retorna o label do status da tarefa
 * @param {string} status
 * @returns {string} Label em português
 */
export function getStatusLabel(status) {
  const labels = {
    todo: 'A Fazer',
    in_progress: 'Em Progresso',
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
 * Retorna o label do status do projeto
 * @param {string} status
 * @returns {string} Label em português
 */
export function getProjectStatusLabel(status) {
  const labels = {
    planning: 'Planejamento',
    in_progress: 'Em Progresso',
    review: 'Revisão',
    completed: 'Concluído',
    archived: 'Arquivado',
  };
  return labels[status] || status;
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
