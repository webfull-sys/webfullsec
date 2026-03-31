/**
 * ============================================
 * WebfullSec — SlashMenu (Menu de Inserção de Blocos)
 * Menu dropdown ativado por "/" para adicionar blocos
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { BLOCK_TYPES } from '@/lib/constants';

/**
 * SlashMenu — Menu flutuante estilo Notion ativado por "/"
 * @param {Object} props
 * @param {boolean} props.isOpen - Se o menu está visível
 * @param {Object} props.position - { top, left } posição do menu
 * @param {string} props.filter - Texto digitado após "/" para filtrar
 * @param {Function} props.onSelect - Callback ao selecionar um tipo de bloco
 * @param {Function} props.onClose - Callback para fechar o menu
 */
export default function SlashMenu({ isOpen, position, filter, onSelect, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);

  // Filtrar tipos de bloco pelo texto digitado
  const filtered = BLOCK_TYPES.filter((bt) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      bt.label.toLowerCase().includes(q) ||
      bt.shortcut.includes(q) ||
      bt.value.includes(q)
    );
  });

  // Agrupar por categoria
  const grouped = filtered.reduce((acc, bt) => {
    if (!acc[bt.category]) acc[bt.category] = [];
    acc[bt.category].push(bt);
    return acc;
  }, {});

  // Resetar seleção quando filtro muda
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Navegação por teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].value);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filtered, onSelect, onClose]);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || filtered.length === 0) return null;

  let flatIndex = 0;

  return (
    <div
      ref={menuRef}
      className="slash-menu"
      style={{ top: position?.top || 0, left: position?.left || 0 }}
      role="listbox"
      aria-label="Menu de inserção de blocos"
    >
      <div className="slash-menu-header">
        <span className="slash-menu-hint">Inserir bloco</span>
        {filter && <span className="slash-menu-filter">/{filter}</span>}
      </div>
      <div className="slash-menu-list">
        {Object.entries(grouped).map(([category, types]) => (
          <div key={category}>
            <div className="slash-menu-category">{category}</div>
            {types.map((bt) => {
              const idx = flatIndex++;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={bt.value}
                  className={`slash-menu-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelect(bt.value)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="slash-menu-item-icon">{bt.icon}</span>
                  <div className="slash-menu-item-info">
                    <span className="slash-menu-item-label">{bt.label}</span>
                    <span className="slash-menu-item-shortcut">/{bt.shortcut}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
