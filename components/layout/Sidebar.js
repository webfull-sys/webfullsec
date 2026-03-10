'use client';

/**
 * ============================================
 * WebfullSec — Componente Sidebar (Navegação lateral)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, APP_VERSION } from '@/lib/constants';

/**
 * Ícones SVG inline para cada item de navegação
 * @param {string} name - Nome do ícone
 * @returns {JSX.Element} SVG do ícone
 */
function NavIcon({ name }) {
  const icons = {
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    inbox: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22,12 16,12 14,15 10,15 8,12 2,12" />
        <path d="M5.45,5.11 L2,12 L2,18 C2,19.1 2.9,20 4,20 L20,20 C21.1,20 22,19.1 22,18 L22,12 L18.55,5.11 C18.22,4.43 17.52,4 16.76,4 L7.24,4 C6.48,4 5.78,4.43 5.45,5.11Z" />
      </svg>
    ),
    tasks: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
    projects: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
    clients: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
    assistant: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <path d="M12 8v2" />
        <path d="M12 14h.01" />
      </svg>
    ),
  };

  return (
    <span className="sidebar-link-icon" role="img" aria-hidden="true">
      {icons[name] || null}
    </span>
  );
}

/**
 * Sidebar principal da aplicação
 * @param {object} props
 * @param {boolean} props.isOpen - Estado de abertura (mobile)
 * @param {function} props.onClose - Callback para fechar (mobile)
 * @param {number} props.inboxCount - Contagem de itens não lidos no inbox
 */
export default function Sidebar({ isOpen = false, onClose, inboxCount = 0 }) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            display: 'none',
          }}
        />
      )}

      <aside
        className={`sidebar ${isOpen ? 'open' : ''}`}
        role="navigation"
        aria-label="Navegação principal"
      >
        {/* Logo / Marca */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon" aria-hidden="true">W</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">WebfullSec</span>
            <span className="sidebar-brand-subtitle">Secretária AI</span>
          </div>
        </div>

        {/* Navegação */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Menu Principal</span>

          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                {item.icon === 'inbox' && inboxCount > 0 && (
                  <span className="sidebar-link-badge" aria-label={`${inboxCount} novos itens`}>
                    {inboxCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Rodapé da sidebar */}
        <div className="sidebar-footer">
          <span className="sidebar-version">v{APP_VERSION}</span>
          <span className="sidebar-version" style={{ marginLeft: 'auto', opacity: 0.5 }}>
            Webfull
          </span>
        </div>
      </aside>

      {/* Estilo do overlay para mobile */}
      <style jsx>{`
        @media (max-width: 768px) {
          .sidebar-overlay {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
