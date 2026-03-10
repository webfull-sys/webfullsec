'use client';

/**
 * ============================================
 * WebfullSec — Componente NotificationCenter
 * Badge + Dropdown de notificações no header
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.0.0
 * ============================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Ícones de tipo de notificação
 */
const TYPE_ICONS = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  error: '❌',
  reminder: '⏰',
};

/**
 * Central de notificações com badge e dropdown
 */
export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  /**
   * Busca contagem de notificações não lidas
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?count=true&unread=true');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch {
      // Silencioso
    }
  }, []);

  /**
   * Busca notificações para o dropdown
   */
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=10');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Silencioso
    }
    setLoading(false);
  };

  // Polling de contagem a cada 15 segundos
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Toggle do dropdown
   */
  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  /**
   * Marcar todas como lidas
   */
  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Silencioso
    }
  };

  /**
   * Formata data relativa
   */
  const formatRelativeTime = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}min`;
    if (diffH < 24) return `${diffH}h`;
    if (diffD < 7) return `${diffD}d`;
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      {/* Badge / Botão */}
      <button
        className="notification-btn"
        onClick={toggleDropdown}
        aria-label={`Notificações (${unreadCount} não lidas)`}
        aria-expanded={isOpen}
        title="Notificações"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="notification-dropdown" role="menu">
          {/* Header do dropdown */}
          <div className="notification-dropdown-header">
            <h3>Notificações</h3>
            {unreadCount > 0 && (
              <button
                className="notification-mark-read"
                onClick={markAllRead}
                aria-label="Marcar todas como lidas"
              >
                Marcar como lidas
              </button>
            )}
          </div>

          {/* Lista de notificações */}
          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">
                <div className="spinner" style={{ width: 20, height: 20 }} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <span>🔔</span>
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <a
                  key={notif.id}
                  href={notif.link || '#'}
                  className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                  onClick={() => setIsOpen(false)}
                  role="menuitem"
                >
                  <span className="notification-item-icon">
                    {TYPE_ICONS[notif.type] || 'ℹ️'}
                  </span>
                  <div className="notification-item-content">
                    <span className="notification-item-title">{notif.title}</span>
                    {notif.message && (
                      <span className="notification-item-message">{notif.message}</span>
                    )}
                  </div>
                  <span className="notification-item-time">
                    {formatRelativeTime(notif.createdAt)}
                  </span>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
