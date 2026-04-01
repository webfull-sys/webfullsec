/**
 * ============================================
 * WebfullSec — BlockEditor (Editor de Blocos Notion-like)
 * Editor completo com slash commands, drag & drop e edição inline
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import BlockRenderer from './BlockRenderer';
import SlashMenu from './SlashMenu';

/**
 * BlockEditor — Editor de blocos completo estilo Notion
 * @param {Object} props
 * @param {Array} props.blocks - Array de blocos do projeto
 * @param {string} props.projectId - ID do projeto
 * @param {Function} props.onBlocksChange - Callback ao alterar blocos (otimista)
 */
export default function BlockEditor({ blocks, projectId, onBlocksChange }) {
  const [focusedBlockId, setFocusedBlockId] = useState(null);
  const [slashMenu, setSlashMenu] = useState({ isOpen: false, position: null, filter: '', blockId: null });
  const [dragOverId, setDragOverId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const debounceRef = useRef({});

  // ==========================================
  // Manipulação de Blocos
  // ==========================================

  /**
   * Atualiza o conteúdo de um bloco específico (debounced para API)
   */
  const handleContentChange = useCallback((blockId, content) => {
    // Atualização otimista local
    const updated = blocks.map((b) => (b.id === blockId ? { ...b, content } : b));
    onBlocksChange(updated);

    // Debounce para salvar na API
    if (debounceRef.current[blockId]) clearTimeout(debounceRef.current[blockId]);
    debounceRef.current[blockId] = setTimeout(async () => {
      try {
        await fetch(`/api/projects/${projectId}/blocks/${blockId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
      } catch (err) {
        console.error('Erro ao salvar bloco:', err);
      }
    }, 500);
  }, [blocks, projectId, onBlocksChange]);

  /**
   * Cria um novo bloco após o bloco indicado
   */
  const createBlock = useCallback(async (afterBlockId, type = 'paragraph', content = '') => {
    try {
      const res = await fetch(`/api/projects/${projectId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content, afterBlockId }),
      });
      if (res.ok) {
        const newBlock = await res.json();
        // Inserir após o bloco indicado
        const idx = blocks.findIndex((b) => b.id === afterBlockId);
        const updated = [...blocks];
        updated.splice(idx + 1, 0, newBlock);
        onBlocksChange(updated);
        // Focar no novo bloco
        setTimeout(() => setFocusedBlockId(newBlock.id), 50);
        return newBlock;
      }
    } catch (err) {
      console.error('Erro ao criar bloco:', err);
    }
    return null;
  }, [blocks, projectId, onBlocksChange]);

  /**
   * Remove um bloco
   */
  const deleteBlock = useCallback(async (blockId) => {
    // Não remover se é o último bloco
    if (blocks.length <= 1) return;

    try {
      await fetch(`/api/projects/${projectId}/blocks/${blockId}`, {
        method: 'DELETE',
      });
      const idx = blocks.findIndex((b) => b.id === blockId);
      const updated = blocks.filter((b) => b.id !== blockId);
      onBlocksChange(updated);
      // Focar no bloco anterior
      if (idx > 0) {
        setFocusedBlockId(updated[idx - 1].id);
      }
    } catch (err) {
      console.error('Erro ao deletar bloco:', err);
    }
  }, [blocks, projectId, onBlocksChange]);

  /**
   * Converte bloco para outro tipo
   */
  const convertBlock = useCallback(async (blockId, newType) => {
    try {
      await fetch(`/api/projects/${projectId}/blocks/${blockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType }),
      });
      const updated = blocks.map((b) =>
        b.id === blockId ? { ...b, type: newType } : b
      );
      onBlocksChange(updated);
    } catch (err) {
      console.error('Erro ao converter bloco:', err);
    }
  }, [blocks, projectId, onBlocksChange]);

  /**
   * Toggle checkbox de um bloco todo
   */
  const handleToggleCheck = useCallback(async (blockId, checked) => {
    const properties = JSON.stringify({ checked });
    try {
      await fetch(`/api/projects/${projectId}/blocks/${blockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties }),
      });
      const updated = blocks.map((b) =>
        b.id === blockId ? { ...b, properties } : b
      );
      onBlocksChange(updated);
    } catch (err) {
      console.error('Erro ao atualizar checkbox:', err);
    }
  }, [blocks, projectId, onBlocksChange]);

  // ==========================================
  // Slash Menu
  // ==========================================

  /**
   * Handler de teclas especiais nos blocos
   */
  const handleBlockKeyDown = useCallback((e, blockId) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    // "/" — Abrir slash menu
    if (e.key === '/' && !slashMenu.isOpen) {
      e.preventDefault();
      const rect = e.target.getBoundingClientRect();
      setSlashMenu({
        isOpen: true,
        position: { top: rect.bottom + 4, left: rect.left },
        filter: '',
        blockId,
      });
      return;
    }

    // Dentro do slash menu, atualizar filtro
    if (slashMenu.isOpen && slashMenu.blockId === blockId) {
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setSlashMenu((prev) => ({ ...prev, filter: prev.filter + e.key }));
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (slashMenu.filter.length > 0) {
          setSlashMenu((prev) => ({ ...prev, filter: prev.filter.slice(0, -1) }));
        } else {
          setSlashMenu({ isOpen: false, position: null, filter: '', blockId: null });
        }
        return;
      }
    }

    // Enter — Criar novo bloco
    if (e.key === 'Enter' && !e.shiftKey && !slashMenu.isOpen) {
      e.preventDefault();
      createBlock(blockId);
      return;
    }

    // Backspace em bloco vazio — Remover bloco
    if (e.key === 'Backspace' && !block.content?.trim() && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(blockId);
      return;
    }

    // Setas para navegar entre blocos
    if (e.key === 'ArrowUp' && !slashMenu.isOpen) {
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx > 0) {
        e.preventDefault();
        setFocusedBlockId(blocks[idx - 1].id);
      }
    }

    if (e.key === 'ArrowDown' && !slashMenu.isOpen) {
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx < blocks.length - 1) {
        e.preventDefault();
        setFocusedBlockId(blocks[idx + 1].id);
      }
    }
  }, [blocks, slashMenu, createBlock, deleteBlock]);

  /**
   * Handler de seleção no slash menu
   */
  const handleSlashSelect = useCallback((type) => {
    const blockId = slashMenu.blockId;
    setSlashMenu({ isOpen: false, position: null, filter: '', blockId: null });

    if (type === 'divider') {
      // Criar bloco divider após o bloco atual
      createBlock(blockId, 'divider', '');
    } else {
      // Converter bloco atual para o tipo selecionado
      convertBlock(blockId, type);
      setTimeout(() => setFocusedBlockId(blockId), 50);
    }
  }, [slashMenu, convertBlock, createBlock]);

  // ==========================================
  // Drag & Drop
  // ==========================================

  const handleDragStart = (e, blockId) => {
    setDraggedId(blockId);
    e.dataTransfer.effectAllowed = 'move';
    // Estilo visual
    e.target.closest('.block-wrapper')?.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    setDraggedId(null);
    setDragOverId(null);
    e.target.closest('.block-wrapper')?.classList.remove('dragging');
  };

  const handleDragOver = (e, blockId) => {
    e.preventDefault();
    if (blockId !== draggedId) {
      setDragOverId(blockId);
    }
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    // Reordenar localmente
    const fromIdx = blocks.findIndex((b) => b.id === draggedId);
    const toIdx = blocks.findIndex((b) => b.id === targetId);
    const updated = [...blocks];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);

    // Atualizar posições
    const withPositions = updated.map((b, i) => ({ ...b, position: i }));
    onBlocksChange(withPositions);

    // Persistir na API
    try {
      await fetch(`/api/projects/${projectId}/blocks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: withPositions.map((b, i) => ({ id: b.id, position: i })),
        }),
      });
    } catch (err) {
      console.error('Erro ao reordenar:', err);
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="block-editor" role="document" aria-label="Editor de conteúdo do projeto">
      {blocks.map((block) => (
        <div
          key={block.id}
          className={`block-wrapper ${dragOverId === block.id ? 'drag-over' : ''} ${draggedId === block.id ? 'dragging' : ''}`}
          onDragOver={(e) => handleDragOver(e, block.id)}
          onDrop={(e) => handleDrop(e, block.id)}
        >
          {/* Controles laterais (visíveis no hover) */}
          <div className="block-controls">
            <button
              className="block-control-btn block-add-btn"
              onClick={() => createBlock(block.id)}
              title="Adicionar bloco abaixo"
              aria-label="Adicionar bloco"
            >
              +
            </button>
            <button
              className="block-control-btn block-drag-btn"
              draggable
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragEnd={handleDragEnd}
              title="Arrastar para reordenar"
              aria-label="Arrastar bloco"
            >
              ⋮⋮
            </button>
          </div>

          {/* Conteúdo do bloco */}
          <div className="block-content">
            <BlockRenderer
              block={block}
              isFocused={focusedBlockId === block.id}
              onContentChange={handleContentChange}
              onKeyDown={handleBlockKeyDown}
              onFocus={(id) => setFocusedBlockId(id)}
              onToggleCheck={handleToggleCheck}
            />
          </div>
        </div>
      ))}

      {/* Área clicável para adicionar bloco no final */}
      <div
        className="block-editor-footer"
        onClick={() => {
          if (blocks.length === 0) {
            createBlock(null);
          } else {
            const lastBlock = blocks[blocks.length - 1];
            createBlock(lastBlock.id);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Clique para adicionar um novo bloco"
      >
        <span className="block-editor-footer-hint">Clique aqui ou pressione Enter para continuar...</span>
      </div>

      {/* Slash Menu */}
      <SlashMenu
        isOpen={slashMenu.isOpen}
        position={slashMenu.position}
        filter={slashMenu.filter}
        onSelect={handleSlashSelect}
        onClose={() => setSlashMenu({ isOpen: false, position: null, filter: '', blockId: null })}
      />
    </div>
  );
}
