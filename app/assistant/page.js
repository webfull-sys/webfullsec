'use client';

/**
 * ============================================
 * WebfullSec — Página do Assistente IA
 * Tela dedicada com chat em tela cheia
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';

export default function AssistantPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll para a última mensagem
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Carregar conversas ao montar
  useEffect(() => {
    fetchConversations();
    inputRef.current?.focus();
  }, []);

  /**
   * Busca lista de conversas
   */
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/ai/conversations?limit=30');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // Silencioso
    }
  };

  /**
   * Carrega uma conversa existente
   */
  const loadConversation = async (id) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setConversationId(id);
        setMessages(
          data.conversation.messages.map((m) => ({
            role: m.role,
            content: m.content,
            actions: m.toolCalls ? JSON.parse(m.toolCalls) : null,
            timestamp: m.createdAt,
          }))
        );
        setError(null);
      }
    } catch {
      // Silencioso
    }
  };

  /**
   * Deleta uma conversa
   */
  const deleteConversation = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Excluir esta conversa?')) return;

    try {
      await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        startNewConversation();
      }
    } catch {
      // Silencioso
    }
  };

  /**
   * Nova conversa
   */
  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  /**
   * Envia mensagem ao agente
   */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao comunicar com o agente');
      }

      const data = await res.json();

      if (data.conversationId) {
        setConversationId(data.conversationId);
        // Atualizar lista de conversas
        fetchConversations();
      }

      const assistantMsg = {
        role: 'assistant',
        content: data.response,
        actions: data.actions?.length > 0 ? data.actions : null,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ ${err.message}`,
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('pt-BR');
  };

  // Sugestões rápidas
  const quickActions = [
    { icon: '📊', label: 'Briefing do Dia', prompt: 'Me dê o briefing completo do dia de hoje' },
    { icon: '📋', label: 'Tarefas Pendentes', prompt: 'Liste todas as minhas tarefas pendentes ordenadas por prioridade' },
    { icon: '📁', label: 'Status Projetos', prompt: 'Qual o status de todos os projetos ativos?' },
    { icon: '✅', label: 'Nova Tarefa', prompt: 'Quero criar uma nova tarefa' },
    { icon: '📁', label: 'Novo Projeto', prompt: 'Quero criar um novo projeto' },
    { icon: '⏰', label: 'Lembrete', prompt: 'Preciso criar um lembrete' },
    { icon: '🔍', label: 'Buscar', prompt: 'Preciso buscar algo nos meus projetos' },
    { icon: '📅', label: 'Agendar', prompt: 'Preciso agendar um bloco de tempo no calendário' },
  ];

  return (
    <AppShell pageTitle="🤖 Assistente IA">
      <div className="assistant-layout">
        {/* Sidebar de conversas */}
        <aside className={`assistant-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="assistant-sidebar-header">
            <h2>Conversas</h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={startNewConversation}
              title="Nova conversa"
            >
              + Nova
            </button>
          </div>

          <div className="assistant-sidebar-list">
            {conversations.length === 0 ? (
              <p className="assistant-sidebar-empty">Nenhuma conversa ainda.</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`assistant-sidebar-item ${conv.id === conversationId ? 'active' : ''}`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="assistant-sidebar-item-info">
                    <span className="assistant-sidebar-item-title">{conv.title}</span>
                    <span className="assistant-sidebar-item-meta">
                      {conv.messageCount} msgs • {formatDate(conv.updatedAt)}
                    </span>
                  </div>
                  <button
                    className="assistant-sidebar-item-delete"
                    onClick={(e) => deleteConversation(conv.id, e)}
                    title="Excluir conversa"
                    aria-label="Excluir conversa"
                  >
                    🗑
                  </button>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Área principal do chat */}
        <div className="assistant-main">
          {/* Toggle sidebar no mobile */}
          <button
            className="assistant-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar de conversas"
          >
            {sidebarOpen ? '◀' : '▶'} Conversas
          </button>

          {/* Mensagens */}
          <div className="assistant-messages">
            {messages.length === 0 ? (
              /* Estado vazio com ações rápidas */
              <div className="assistant-empty">
                <div className="assistant-empty-logo">🤖</div>
                <h2 className="assistant-empty-title">SecIA — Sua Secretária Executiva</h2>
                <p className="assistant-empty-text">
                  Como posso ajudar você hoje? Escolha uma ação rápida ou escreva sua mensagem.
                </p>
                <div className="assistant-quick-grid">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      className="assistant-quick-btn"
                      onClick={() => {
                        setInput(action.prompt);
                        inputRef.current?.focus();
                      }}
                    >
                      <span className="assistant-quick-icon">{action.icon}</span>
                      <span className="assistant-quick-label">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`assistant-msg ${msg.role === 'user' ? 'user' : 'bot'} ${msg.isError ? 'error' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="assistant-msg-avatar">🤖</div>
                  )}
                  <div className="assistant-msg-bubble">
                    <div className="assistant-msg-text">{msg.content}</div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="assistant-msg-actions">
                        <div className="assistant-msg-actions-title">⚡ Ações executadas:</div>
                        {msg.actions.map((action, j) => (
                          <div key={j} className="assistant-msg-action-item">
                            <span>{action.result?.success ? '✅' : '❌'}</span>
                            <span>{action.result?.message || action.type}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="assistant-msg-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  {msg.role === 'user' && (
                    <div className="assistant-msg-avatar user">👤</div>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="assistant-msg bot">
                <div className="assistant-msg-avatar">🤖</div>
                <div className="assistant-msg-bubble">
                  <div className="ai-chat-typing">
                    <span className="ai-chat-typing-dot" />
                    <span className="ai-chat-typing-dot" />
                    <span className="ai-chat-typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="assistant-input-area">
            <textarea
              ref={inputRef}
              className="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte algo à SecIA... (Enter para enviar, Shift+Enter para nova linha)"
              rows={2}
              disabled={loading}
              aria-label="Mensagem para o assistente"
            />
            <button
              className="assistant-send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              title="Enviar mensagem"
              aria-label="Enviar"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
