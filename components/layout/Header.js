'use client';

/**
 * ============================================
 * WebfullSec — Componente Header (Barra superior)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 */

import { useState, useEffect } from 'react';
import { getGreeting, formatDate } from '@/lib/utils';
import NotificationCenter from '@/components/notifications/NotificationCenter';

/**
 * Header da aplicação com busca global, notificações, chat IA e menu mobile
 * @param {object} props
 * @param {string} props.title - Título da página atual
 * @param {function} props.onMenuToggle - Toggle da sidebar (mobile)
 * @param {function} props.onCommandPalette - Abre command palette
 * @param {function} props.onChatToggle - Toggle do chat IA
 * @param {number} props.notifRefresh - Counter para forçar refresh das notificações
 */
export default function Header({ title, onMenuToggle, onCommandPalette, onChatToggle, notifRefresh }) {
  const [currentTime, setCurrentTime] = useState('');

  // Atualiza horário a cada minuto
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="header" role="banner">
      {/* Lado esquerdo: Menu toggle (mobile) + Título */}
      <div className="header-left">
        <button
          className="menu-toggle"
          onClick={onMenuToggle}
          aria-label="Abrir menu de navegação"
          title="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div>
          <h1 className="header-title">{title || getGreeting()}</h1>
        </div>
      </div>

      {/* Centro: Barra de busca rápida */}
      <div className="header-center">
        <button
          className="search-trigger"
          onClick={onCommandPalette}
          aria-label="Abrir busca rápida (Ctrl+K)"
          title="Busca rápida"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Buscar tarefas, projetos, clientes...</span>
          <span className="search-trigger-key">Ctrl+K</span>
        </button>
      </div>

      {/* Lado direito: Chat IA + Notificações + Relógio */}
      <div className="header-right">
        {/* Botão do Chat IA */}
        <button
          className="header-icon-btn"
          onClick={onChatToggle}
          title="Assistente IA (Ctrl+J)"
          aria-label="Abrir assistente IA"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>

        {/* Central de Notificações */}
        <NotificationCenter key={notifRefresh} />

        {/* Relógio e Data */}
        <span className="font-mono" style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)'
        }}>
          {formatDate(new Date(), { weekday: 'short' })}
        </span>
        <span className="font-mono" style={{
          fontSize: 'var(--text-md)',
          color: 'var(--accent)',
          fontWeight: 600
        }}>
          {currentTime}
        </span>
      </div>
    </header>
  );
}

