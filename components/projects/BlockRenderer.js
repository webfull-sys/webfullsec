/**
 * ============================================
 * WebfullSec — BlockRenderer (Renderizador de Blocos)
 * Renderiza cada tipo de bloco do editor Notion-like
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

/**
 * BlockRenderer — Renderiza um bloco individual com edição inline
 * @param {Object} props
 * @param {Object} props.block - Dados do bloco { id, type, content, properties }
 * @param {boolean} props.isFocused - Se este bloco está focado
 * @param {Function} props.onContentChange - Callback ao alterar conteúdo
 * @param {Function} props.onKeyDown - Callback para teclas especiais (Enter, Backspace, /)
 * @param {Function} props.onFocus - Callback ao focar
 * @param {Function} props.onToggleCheck - Callback para alternar checkbox (todo)
 * @param {Function} props.onToggleCollapse - Callback para toggle bloco
 */
export default function BlockRenderer({
  block,
  isFocused,
  onContentChange,
  onKeyDown,
  onFocus,
  onToggleCheck,
  onToggleCollapse,
}) {
  const editRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Parsear propriedades do bloco
  const props = block.properties ? (typeof block.properties === 'string' ? JSON.parse(block.properties) : block.properties) : {};

  // Focar quando isFocused muda
  useEffect(() => {
    if (isFocused && editRef.current) {
      editRef.current.focus();
      // Posicionar cursor no final
      const range = document.createRange();
      const selection = window.getSelection();
      if (editRef.current.childNodes.length > 0) {
        range.selectNodeContents(editRef.current);
        range.collapse(false);
      } else {
        range.setStart(editRef.current, 0);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [isFocused]);

  // Handler de input
  const handleInput = useCallback(() => {
    if (editRef.current) {
      onContentChange(block.id, editRef.current.textContent || '');
    }
  }, [block.id, onContentChange]);

  // Handler de teclas
  const handleKeyDown = useCallback((e) => {
    onKeyDown(e, block.id);
  }, [block.id, onKeyDown]);

  // Elemento editável compartilhado
  const editableProps = {
    ref: editRef,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    onFocus: () => onFocus(block.id),
    'data-placeholder': getPlaceholder(block.type),
    'aria-label': `Bloco ${block.type}`,
  };

  // Renderizar conforme o tipo
  switch (block.type) {
    case 'heading1':
      return (
        <h1 className="block-heading1" {...editableProps}>
          {block.content}
        </h1>
      );

    case 'heading2':
      return (
        <h2 className="block-heading2" {...editableProps}>
          {block.content}
        </h2>
      );

    case 'heading3':
      return (
        <h3 className="block-heading3" {...editableProps}>
          {block.content}
        </h3>
      );

    case 'paragraph':
      return (
        <p className="block-paragraph" {...editableProps}>
          {block.content}
        </p>
      );

    case 'todo':
      return (
        <div className={`block-todo ${props.checked ? 'checked' : ''}`}>
          <button
            className="block-todo-checkbox"
            onClick={() => onToggleCheck(block.id, !props.checked)}
            aria-label={props.checked ? 'Desmarcar' : 'Marcar'}
          >
            {props.checked ? '☑' : '☐'}
          </button>
          <span className="block-todo-text" {...editableProps}>
            {block.content}
          </span>
        </div>
      );

    case 'bulleted_list':
      return (
        <div className="block-list-item">
          <span className="block-list-bullet">•</span>
          <span className="block-list-text" {...editableProps}>
            {block.content}
          </span>
        </div>
      );

    case 'numbered_list':
      return (
        <div className="block-list-item">
          <span className="block-list-number">{(props.number || 1)}.</span>
          <span className="block-list-text" {...editableProps}>
            {block.content}
          </span>
        </div>
      );

    case 'toggle':
      return (
        <div className="block-toggle">
          <div className="block-toggle-header">
            <button
              className={`block-toggle-arrow ${isCollapsed ? '' : 'open'}`}
              onClick={() => {
                setIsCollapsed(!isCollapsed);
                onToggleCollapse?.(block.id, !isCollapsed);
              }}
              aria-label={isCollapsed ? 'Expandir' : 'Colapsar'}
            >
              ▸
            </button>
            <span className="block-toggle-text" {...editableProps}>
              {block.content}
            </span>
          </div>
          {!isCollapsed && block.children?.length > 0 && (
            <div className="block-toggle-children">
              {/* Filhos serão renderizados pelo BlockEditor */}
            </div>
          )}
        </div>
      );

    case 'callout':
      return (
        <div className="block-callout" style={{ borderLeftColor: props.color || 'var(--accent)' }}>
          <span className="block-callout-icon">{props.icon || '💡'}</span>
          <span className="block-callout-text" {...editableProps}>
            {block.content}
          </span>
        </div>
      );

    case 'quote':
      return (
        <blockquote className="block-quote" {...editableProps}>
          {block.content}
        </blockquote>
      );

    case 'code':
      return (
        <div className="block-code-wrapper">
          <div className="block-code-header">
            <span className="block-code-lang">{props.language || 'plain'}</span>
          </div>
          <pre className="block-code">
            <code {...editableProps}>{block.content}</code>
          </pre>
        </div>
      );

    case 'divider':
      return <hr className="block-divider" />;

    case 'image':
      return (
        <div className="block-image">
          {props.url ? (
            <Image
              src={props.url}
              alt={block.content || 'Imagem'}
              className="block-image-img"
              width={1200}
              height={800}
              unoptimized
            />
          ) : (
            <div className="block-image-placeholder">
              <span>🖼️</span>
              <span>Adicionar imagem (cole uma URL)</span>
            </div>
          )}
          {block.content && <span className="block-image-caption">{block.content}</span>}
        </div>
      );

    default:
      return (
        <p className="block-paragraph" {...editableProps}>
          {block.content}
        </p>
      );
  }
}

/**
 * Retorna placeholder para cada tipo de bloco
 */
function getPlaceholder(type) {
  const placeholders = {
    paragraph: "Digite '/' para comandos...",
    heading1: 'Título 1',
    heading2: 'Título 2',
    heading3: 'Título 3',
    todo: 'Tarefa...',
    bulleted_list: 'Item da lista',
    numbered_list: 'Item da lista',
    toggle: 'Toggle...',
    callout: 'Destaque...',
    quote: 'Citação...',
    code: 'Código...',
  };
  return placeholders[type] || 'Digite algo...';
}
