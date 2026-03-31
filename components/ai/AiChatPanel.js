'use client';

/**
 * ============================================
 * WebfullSec — Componente AiChatPanel
 * Painel de chat flutuante com o agente IA
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 * Painel slide-in com chat do agente, histórico de
 * conversas, indicador de ações executadas e atalho Ctrl+J.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Painel de chat com o agente IA SecIA
 * @param {object} props
 * @param {boolean} props.isOpen - Se o painel está aberto
 * @param {function} props.onClose - Callback para fechar o painel
 * @param {function} props.onNotification - Callback quando há nova notificação
 */
export default function AiChatPanel({ isOpen, onClose, onNotification }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
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

  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Carregar conversas quando abrir o histórico
  useEffect(() => {
    if (showHistory) {
      fetchConversations();
    }
  }, [showHistory]);

  /**
   * Busca lista de conversas anteriores
   */
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/ai/conversations?limit=15');
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
        setShowHistory(false);
      }
    } catch {
      // Silencioso
    }
  };

  /**
   * Inicia nova conversa
   */
  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setShowHistory(false);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  /**
   * Envia mensagem ao agente IA
   */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);

    // Adicionar mensagem do usuário
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/n8n-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId, agentType: 'general' }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao comunicar com o agente');
      }

      const data = await res.json();

      // Salvar ID da conversa
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Adicionar resposta do assistente
      const assistantMsg = {
        role: 'assistant',
        content: data.response,
        actions: data.actions?.length > 0 ? data.actions : null,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Notificar sobre ações executadas
      if (data.actions?.length > 0 && onNotification) {
        onNotification();
      }
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

  /**
   * Manipula tecla Enter (Shift+Enter = nova linha)
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Sugestões rápidas para o chat vazio
  const quickSuggestions = [
    { icon: '📋', text: 'Quais são minhas tarefas de hoje?' },
    { icon: '📊', text: 'Me dê um briefing do dia' },
    { icon: '✅', text: 'Criar uma nova tarefa' },
    { icon: '📁', text: 'Status dos projetos ativos' },
  ];

  /**
   * Formata hora para exibição
   */
  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="ai-chat-overlay"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      {/* Painel de Chat */}
      <div
        className="ai-chat-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Chat com Assistente IA"
      >
        {/* Header do Chat */}
        <div className="ai-chat-header">
          <div className="ai-chat-header-info">
            <div className="ai-chat-avatar" aria-hidden="true">
              <span>🤖</span>
            </div>
            <div>
              <h2 className="ai-chat-name">SecIA</h2>
              <span className="ai-chat-status">
                {loading ? '⏳ Pensando...' : '🟢 Online'}
              </span>
            </div>
          </div>
          <div className="ai-chat-header-actions">
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setShowHistory(!showHistory)}
              title="Histórico de conversas"
              aria-label="Histórico de conversas"
            >
              📚
            </button>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={startNewConversation}
              title="Nova conversa"
              aria-label="Nova conversa"
            >
              ✨
            </button>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={onClose}
              title="Fechar (Ctrl+J)"
              aria-label="Fechar chat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Lista de Conversas (Histórico) */}
        {showHistory && (
          <div className="ai-chat-history">
            <h3 className="ai-chat-history-title">Conversas Anteriores</h3>
            {conversations.length === 0 ? (
              <p className="ai-chat-history-empty">Nenhuma conversa anterior.</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`ai-chat-history-item ${conv.id === conversationId ? 'active' : ''}`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <span className="ai-chat-history-item-title">{conv.title}</span>
                  <span className="ai-chat-history-item-meta">
                    {conv.messageCount} msgs •{' '}
                    {new Date(conv.updatedAt).toLocaleDateString('pt-BR')}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Área de Mensagens */}
        <div className="ai-chat-messages">
          {messages.length === 0 && !showHistory ? (
            /* Estado vazio: sugestões rápidas */
            <div className="ai-chat-empty">
              <div className="ai-chat-empty-icon">🤖</div>
              <h3 className="ai-chat-empty-title">Olá! Sou a SecIA</h3>
              <p className="ai-chat-empty-text">
                Sua secretária executiva digital. Como posso ajudar?
              </p>
              <div className="ai-chat-suggestions">
                {quickSuggestions.map((s, i) => (
                  <button
                    key={i}
                    className="ai-chat-suggestion"
                    onClick={() => {
                      setInput(s.text);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                  >
                    <span>{s.icon}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Mensagens do chat */
            messages.map((msg, i) => (
              <div
                key={i}
                className={`ai-chat-msg ${msg.role === 'user' ? 'user' : 'assistant'} ${msg.isError ? 'error' : ''}`}
              >
                <div className="ai-chat-msg-bubble">
                  <div className="ai-chat-msg-content">
                    {msg.content}
                  </div>
                  {/* Ações executadas pelo agente */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="ai-chat-actions">
                      <div className="ai-chat-actions-title">⚡ Ações executadas:</div>
                      {msg.actions.map((action, j) => (
                        <div key={j} className="ai-chat-action-item">
                          <span className={`ai-chat-action-status ${action.result?.success ? 'success' : 'failed'}`}>
                            {action.result?.success ? '✅' : '❌'}
                          </span>
                          <span>{action.result?.message || action.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <span className="ai-chat-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))
          )}

          {/* Indicador de "pensando" */}
          {loading && (
            <div className="ai-chat-msg assistant">
              <div className="ai-chat-msg-bubble">
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

        {/* Erro global */}
        {error && !loading && (
          <div className="ai-chat-error">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} aria-label="Fechar erro">✕</button>
          </div>
        )}

        {/* Input de Mensagem */}
        <div className="ai-chat-input-area">
          <textarea
            ref={inputRef}
            className="ai-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... (Enter para enviar)"
            rows={1}
            disabled={loading}
            aria-label="Mensagem para o assistente"
          />
          <button
            className="ai-chat-send"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            title="Enviar mensagem"
            aria-label="Enviar mensagem"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        {/* Footer com atalho */}
        <div className="ai-chat-footer">
          <kbd>Ctrl+J</kbd> para abrir/fechar • SecIA por{' '}
          <a href="https://webfull.com.br" target="_blank" rel="noopener noreferrer">
            Webfull
          </a>
        </div>
      </div>
    </>
  );
}
