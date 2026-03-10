'use client';

/**
 * ============================================
 * WebfullSec — AppShell (Wrapper de layout)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 * Componente client que gerencia sidebar, header,
 * command palette, chat IA e atalhos de teclado globais.
 */

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import CommandPalette from '@/components/search/CommandPalette';
import AiChatPanel from '@/components/ai/AiChatPanel';

/**
 * App Shell: gerencia estado global de UI
 * @param {object} props
 * @param {string} props.pageTitle - Título da página atual
 * @param {React.ReactNode} props.children - Conteúdo da página
 */
export default function AppShell({ pageTitle, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [notifRefresh, setNotifRefresh] = useState(0);

  // Buscar contagem de itens não lidos do inbox
  useEffect(() => {
    const fetchInboxCount = async () => {
      try {
        const res = await fetch('/api/inbox?unreadCount=true');
        if (res.ok) {
          const data = await res.json();
          setInboxCount(data.count || 0);
        }
      } catch {
        // Silencioso em caso de erro
      }
    };
    fetchInboxCount();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchInboxCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Atalhos de teclado globais: Ctrl+K (Command Palette), Ctrl+J (Chat IA)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
      // Ctrl+J: Chat IA
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        setChatOpen(prev => !prev);
      }
      // Escape fecha tudo
      if (e.key === 'Escape') {
        setCommandOpen(false);
        setSidebarOpen(false);
        setChatOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const openCommand = useCallback(() => {
    setCommandOpen(true);
  }, []);

  const toggleChat = useCallback(() => {
    setChatOpen(prev => !prev);
  }, []);

  // Callback para quando o agente IA cria notificações
  const handleAiNotification = useCallback(() => {
    setNotifRefresh(prev => prev + 1);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        inboxCount={inboxCount}
      />

      <main className="app-main" id="main-content" role="main">
        <Header
          title={pageTitle}
          onMenuToggle={toggleSidebar}
          onCommandPalette={openCommand}
          onChatToggle={toggleChat}
          notifRefresh={notifRefresh}
        />

        <div className="app-content">
          {children}
        </div>
      </main>

      <CommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
      />

      {/* Painel do Chat com Agente IA */}
      <AiChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        onNotification={handleAiNotification}
      />

      {/* Botão flutuante do agente IA (FAB) */}
      {!chatOpen && (
        <button
          className="ai-fab"
          onClick={toggleChat}
          title="Abrir Assistente IA (Ctrl+J)"
          aria-label="Abrir assistente IA"
        >
          <span className="ai-fab-icon">🤖</span>
          <span className="ai-fab-pulse" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

