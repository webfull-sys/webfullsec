/**
 * ============================================
 * WebfullSec — Constantes do Sistema
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.7.0
 * ============================================
 * Definições centralizadas de status, categorias,
 * prioridades e navegação do sistema.
 */

// Categorias de projeto
export const PROJECT_CATEGORIES = [
  { value: 'site', label: '🌐 Site', color: '#00e5ff' },
  { value: 'automation', label: '⚡ Automação', color: '#ffab00' },
  { value: 'beat', label: '🎵 Beat', color: '#e040fb' },
  { value: 'app', label: '📱 App', color: '#00e676' },
  { value: 'plugin', label: '🧩 Plugin', color: '#ff4081' },
];

// Status de projeto (aprimorado com backlog e aguardando cliente)
export const PROJECT_STATUSES = [
  { value: 'backlog', label: 'Novos Projetos', color: '#4a5568', icon: '📋' },
  { value: 'in_progress', label: 'Produção', color: '#00e5ff', icon: '🔄' },
  { value: 'waiting_client', label: 'Online', color: '#ffab00', icon: '⏳' },
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

// Tipos de blocos do editor (estilo Notion)
export const BLOCK_TYPES = [
  // Texto
  { value: 'paragraph', label: 'Texto', icon: '📝', category: 'Texto', shortcut: 'p' },
  { value: 'heading1', label: 'Título 1', icon: 'H1', category: 'Texto', shortcut: 'h1' },
  { value: 'heading2', label: 'Título 2', icon: 'H2', category: 'Texto', shortcut: 'h2' },
  { value: 'heading3', label: 'Título 3', icon: 'H3', category: 'Texto', shortcut: 'h3' },
  { value: 'quote', label: 'Citação', icon: '❝', category: 'Texto', shortcut: 'quote' },
  { value: 'callout', label: 'Destaque', icon: '💡', category: 'Texto', shortcut: 'callout' },
  { value: 'code', label: 'Código', icon: '⌨️', category: 'Texto', shortcut: 'code' },
  // Listas
  { value: 'bulleted_list', label: 'Lista', icon: '•', category: 'Listas', shortcut: 'ul' },
  { value: 'numbered_list', label: 'Lista Numerada', icon: '1.', category: 'Listas', shortcut: 'ol' },
  { value: 'todo', label: 'Checklist', icon: '☑️', category: 'Listas', shortcut: 'todo' },
  { value: 'toggle', label: 'Toggle', icon: '▸', category: 'Listas', shortcut: 'toggle' },
  // Mídia & Layout
  { value: 'divider', label: 'Divisor', icon: '—', category: 'Layout', shortcut: 'hr' },
  { value: 'image', label: 'Imagem', icon: '🖼️', category: 'Mídia', shortcut: 'img' },
];

// Papéis dos agentes no projeto
export const AGENT_ROLES = [
  { value: 'assistant', label: 'Assistente', icon: '🤖' },
  { value: 'reviewer', label: 'Revisor', icon: '🔍' },
  { value: 'executor', label: 'Executor', icon: '⚡' },
];

// Navegação principal
export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/assistant', label: 'Assistente', icon: 'assistant' },
  { href: '/inbox', label: 'Inbox', icon: 'inbox' },
  { href: '/tasks', label: 'Tarefas', icon: 'tasks' },
  { href: '/projects', label: 'Projetos', icon: 'projects' },
  { href: '/clients', label: 'Clientes', icon: 'clients' },
  { href: '/files', label: 'Organizador AI', icon: 'files' },
  { href: '/agents', label: 'Super Agentes', icon: 'assistant' },
  { href: '/calendar', label: 'Calendário', icon: 'calendar' },
  { href: '/settings', label: 'Configurações', icon: 'settings' },
];

// Versão do sistema
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '2.7.0';
export const APP_NAME = 'WebfullSec';
export const APP_AUTHOR = 'Webfull';
export const APP_SITE = 'https://webfull.com.br';
