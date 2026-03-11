/**
 * ============================================
 * WebfullSec — Constantes do Sistema
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.2.0
 * ============================================
 * Definições centralizadas de status, categorias,
 * prioridades e navegação do sistema.
 */

// Categorias de projeto
export const PROJECT_CATEGORIES = [
  { value: 'site', label: '🌐 Site', color: '#00e5ff' },
  { value: 'automation', label: '⚡ Automação', color: '#ffab00' },
  { value: 'beat', label: '🎵 Beat', color: '#e040fb' },
];

// Status de projeto (aprimorado com backlog e aguardando cliente)
export const PROJECT_STATUSES = [
  { value: 'backlog', label: 'Backlog', color: '#4a5568', icon: '📋' },
  { value: 'in_progress', label: 'Em Andamento', color: '#00e5ff', icon: '🔄' },
  { value: 'waiting_client', label: 'Aguardando Cliente', color: '#ffab00', icon: '⏳' },
  { value: 'completed', label: 'Concluído', color: '#00e676', icon: '✅' },
  { value: 'archived', label: 'Arquivado', color: '#7a8a9e', icon: '📦' },
];

// Status de tarefa (aprimorado com inbox)
export const TASK_STATUSES = [
  { value: 'inbox', label: 'Inbox', color: '#448aff', icon: '📥' },
  { value: 'todo', label: 'Para Fazer', color: '#7a8a9e', icon: '○' },
  { value: 'in_progress', label: 'Fazendo', color: '#00e5ff', icon: '▶' },
  { value: 'done', label: 'Concluída', color: '#00e676', icon: '✓' },
  { value: 'cancelled', label: 'Cancelada', color: '#ff5252', icon: '✗' },
];

// Níveis de prioridade
export const PRIORITY_LEVELS = [
  { value: 1, label: 'Baixa', color: '#7a8a9e', icon: '○' },
  { value: 2, label: 'Média', color: '#00e5ff', icon: '◐' },
  { value: 3, label: 'Alta', color: '#ffab00', icon: '●' },
  { value: 4, label: 'Urgente', color: '#ff5252', icon: '🔥' },
];

// Níveis de importância do cliente (1-5)
export const IMPORTANCE_LEVELS = [
  { value: 1, label: 'Muito Baixa', color: '#4a5568', icon: '☆' },
  { value: 2, label: 'Baixa', color: '#7a8a9e', icon: '★' },
  { value: 3, label: 'Média', color: '#00e5ff', icon: '★★' },
  { value: 4, label: 'Alta', color: '#ffab00', icon: '★★★' },
  { value: 5, label: 'VIP', color: '#e040fb', icon: '👑' },
];

// Tipos de memória/log
export const MEMORY_TYPES = [
  { value: 'progress', label: 'Progresso', color: '#00e5ff', icon: '📝' },
  { value: 'decision', label: 'Decisão', color: '#ffab00', icon: '⚖️' },
  { value: 'blocker', label: 'Bloqueio', color: '#ff5252', icon: '🚧' },
  { value: 'milestone', label: 'Marco', color: '#00e676', icon: '🏆' },
  { value: 'note', label: 'Nota', color: '#7a8a9e', icon: '📌' },
  { value: 'ai_summary', label: 'Resumo IA', color: '#e040fb', icon: '🤖' },
];

// Fontes de inbox (aprimorado com pensamento e voz)
export const INBOX_SOURCES = [
  { value: 'manual', label: 'Manual', icon: '✏️' },
  { value: 'email', label: 'E-mail', icon: '📧' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'telegram', label: 'Telegram', icon: '📱' },
  { value: 'webhook', label: 'Webhook', icon: '🔗' },
  { value: 'thought', label: 'Pensamento', icon: '💡' },
  { value: 'voice', label: 'Voz', icon: '🎤' },
  { value: 'ai', label: 'Assistente IA', icon: '🤖' },
];

// Recorrência de tarefas
export const TASK_RECURRENCES = [
  { value: null, label: 'Sem recorrência' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

// Navegação principal
export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/assistant', label: 'Assistente', icon: 'assistant' },
  { href: '/inbox', label: 'Inbox', icon: 'inbox' },
  { href: '/tasks', label: 'Tarefas', icon: 'tasks' },
  { href: '/crm', label: 'CRM & Projetos', icon: 'clients' },
  { href: '/beats', label: 'Studio Beats', icon: 'music' },
  { href: '/agents', label: 'Super Agentes', icon: 'assistant' },
  { href: '/calendar', label: 'Calendário', icon: 'calendar' },
  { href: '/settings', label: 'Configurações', icon: 'settings' },
];

// Versão do sistema
export const APP_VERSION = process.env.APP_VERSION || '2.5.0';
export const APP_NAME = 'WebfullSec';
export const APP_AUTHOR = 'Webfull';
export const APP_SITE = 'https://webfull.com.br';
