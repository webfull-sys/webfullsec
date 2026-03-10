/**
 * ============================================
 * WebfullSec — Constantes do Sistema
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 */

// Categorias de projeto
export const PROJECT_CATEGORIES = [
  { value: 'site', label: '🌐 Site', color: '#00e5ff' },
  { value: 'automation', label: '⚡ Automação', color: '#ffab00' },
  { value: 'beat', label: '🎵 Beat', color: '#e040fb' },
];

// Status de projeto
export const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planejamento', color: '#7a8a9e' },
  { value: 'in_progress', label: 'Em Progresso', color: '#00e5ff' },
  { value: 'review', label: 'Revisão', color: '#ffab00' },
  { value: 'completed', label: 'Concluído', color: '#00e676' },
  { value: 'archived', label: 'Arquivado', color: '#4a5568' },
];

// Status de tarefa
export const TASK_STATUSES = [
  { value: 'todo', label: 'A Fazer', color: '#7a8a9e' },
  { value: 'in_progress', label: 'Em Progresso', color: '#00e5ff' },
  { value: 'done', label: 'Concluída', color: '#00e676' },
  { value: 'cancelled', label: 'Cancelada', color: '#ff5252' },
];

// Níveis de prioridade
export const PRIORITY_LEVELS = [
  { value: 1, label: 'Baixa', color: '#7a8a9e', icon: '○' },
  { value: 2, label: 'Média', color: '#00e5ff', icon: '◐' },
  { value: 3, label: 'Alta', color: '#ffab00', icon: '●' },
  { value: 4, label: 'Urgente', color: '#ff5252', icon: '🔥' },
];

// Fontes de inbox
export const INBOX_SOURCES = [
  { value: 'manual', label: 'Manual', icon: '✏️' },
  { value: 'email', label: 'E-mail', icon: '📧' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'telegram', label: 'Telegram', icon: '📱' },
  { value: 'webhook', label: 'Webhook', icon: '🔗' },
  { value: 'ai', label: 'Assistente IA', icon: '🤖' },
];

// Navegação principal
export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/assistant', label: 'Assistente', icon: 'assistant' },
  { href: '/inbox', label: 'Inbox', icon: 'inbox' },
  { href: '/tasks', label: 'Tarefas', icon: 'tasks' },
  { href: '/projects', label: 'Projetos', icon: 'projects' },
  { href: '/clients', label: 'Clientes', icon: 'clients' },
  { href: '/calendar', label: 'Calendário', icon: 'calendar' },
  { href: '/settings', label: 'Configurações', icon: 'settings' },
];

// Versão do sistema
export const APP_VERSION = process.env.APP_VERSION || '2.0.0';
export const APP_NAME = 'WebfullSec';
export const APP_AUTHOR = 'Webfull';
export const APP_SITE = 'https://webfull.com.br';

