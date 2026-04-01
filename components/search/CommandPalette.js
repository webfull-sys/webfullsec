'use client';

/**
 * ============================================
 * WebfullSec — Command Palette (Ctrl+K)
 * Busca global rápida + criação de tarefas
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';

/**
 * Command Palette: busca instantânea, navegação e criação rápida
 * @param {object} props
 * @param {boolean} props.isOpen - Visibilidade do painel
 * @param {function} props.onClose - Fecha o painel
 */
export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  // Foca no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setQuery('');
        setResults([]);
        setSelectedIndex(0);
      }, 0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Busca global debounced
  useEffect(() => {
    if (!query.trim()) {
      setTimeout(() => {
        setResults(NAV_ITEMS.map(item => ({
          type: 'nav',
          title: item.label,
          description: `Ir para ${item.label}`,
          href: item.href,
          icon: getTypeIcon('nav'),
        })));
      }, 0);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {
        // Fallback: filtrar navegação
        setResults(NAV_ITEMS
          .filter(item => item.label.toLowerCase().includes(query.toLowerCase()))
          .map(item => ({
            type: 'nav',
            title: item.label,
            description: `Ir para ${item.label}`,
            href: item.href,
            icon: getTypeIcon('nav'),
          }))
        );
      }
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Seleciona um item
  const handleSelect = useCallback((item) => {
    if (item.href) {
      router.push(item.href);
    }
    onClose();
  }, [router, onClose]);

  // Navegação por teclado
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  }, [results, selectedIndex, onClose, handleSelect]);

  if (!isOpen) return null;

  return (
    <div className="command-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Busca rápida">
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        {/* Input de busca */}
        <div className="command-input-wrapper">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="command-input"
            type="text"
            placeholder="Buscar ou digitar um comando..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            aria-label="Campo de busca"
          />
          {loading && <span className="spinner" aria-label="Buscando..." />}
        </div>

        {/* Resultados */}
        <div className="command-results" role="listbox" aria-label="Resultados da busca">
          {results.length === 0 && query && (
            <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                Nenhum resultado encontrado para &quot;{query}&quot;
              </p>
            </div>
          )}
          {results.map((item, index) => (
            <div
              key={`${item.type}-${item.title}-${index}`}
              className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(item)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <span className="command-item-icon">{item.icon || getTypeIcon(item.type)}</span>
              <div>
                <div className="command-item-title">{item.title}</div>
                {item.description && (
                  <div className="command-item-desc">{item.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé com atalhos */}
        <div className="command-footer">
          <span>↑↓ navegar</span>
          <span>↵ selecionar</span>
          <span>esc fechar</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Retorna ícone baseado no tipo do resultado
 * @param {string} type - Tipo do item
 * @returns {string} Emoji do ícone
 */
function getTypeIcon(type) {
  const icons = {
    nav: '🔗',
    task: '✅',
    project: '📁',
    client: '👤',
    inbox: '📥',
  };
  return icons[type] || '📄';
}
