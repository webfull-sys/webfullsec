/**
 * ============================================
 * WebfullSec — ProjectHeader (Cabeçalho estilo Notion)
 * Capa, ícone, título editável inline
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

// Emojis populares para seleção de ícone
const POPULAR_ICONS = [
  '📁', '🚀', '💻', '🌐', '⚡', '🎵', '🎨', '📊', '🔧', '📱',
  '🏗️', '📋', '🎯', '🔒', '💡', '🤖', '📦', '🛠️', '✨', '🔥',
  '📈', '🏆', '💰', '🎬', '📝', '🌟', '⭐', '🧩', '🔗', '🎮',
];

// Cores de capa padrão (gradientes)
const COVER_GRADIENTS = [
  'linear-gradient(135deg, #0a1628, #1a2744)',
  'linear-gradient(135deg, #1a0a28, #2a1444)',
  'linear-gradient(135deg, #0a2818, #144428)',
  'linear-gradient(135deg, #281a0a, #443014)',
  'linear-gradient(135deg, #0a1828, #1a3844)',
  'linear-gradient(135deg, #280a1a, #441428)',
];

/**
 * ProjectHeader — Cabeçalho da página do projeto estilo Notion
 * @param {Object} props
 * @param {Object} props.project - Dados do projeto
 * @param {Function} props.onUpdate - Callback para atualizar projeto
 */
export default function ProjectHeader({ project, onUpdate }) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const titleRef = useRef(null);
  const debounceRef = useRef(null);

  /**
   * Atualiza o título com debounce
   */
  const handleTitleChange = useCallback(() => {
    if (!titleRef.current) return;
    const newTitle = titleRef.current.textContent?.trim();
    if (!newTitle) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate({ title: newTitle });
    }, 600);
  }, [onUpdate]);

  /**
   * Atualiza o ícone do projeto
   */
  const handleIconSelect = useCallback((icon) => {
    onUpdate({ icon });
    setShowIconPicker(false);
  }, [onUpdate]);

  /**
   * Atualiza a capa do projeto
   */
  const handleCoverSelect = useCallback((cover) => {
    onUpdate({ coverImage: cover });
    setShowCoverPicker(false);
  }, [onUpdate]);

  /**
   * Remove a capa
   */
  const handleRemoveCover = useCallback(() => {
    onUpdate({ coverImage: null });
    setShowCoverPicker(false);
  }, [onUpdate]);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok && data.url) {
        if (type === 'cover') {
          onUpdate({ coverImage: `url('${data.url}')` });
          setShowCoverPicker(false);
        } else if (type === 'icon') {
          onUpdate({ icon: data.url });
          setShowIconPicker(false);
        }
      } else {
        alert(`Erro no upload: ${data.error || 'Desconhecido'}`);
      }
    } catch (err) {
      console.error('Erro no upload', err);
      alert('Falha crítica no upload. Verifique console.');
    } finally {
      // reseta o input
      e.target.value = '';
    }
  };

  // Processar o coverImage de forma robusta para evitar avisos de hidratação/estilo do React
  const coverValue = project?.coverImage || COVER_GRADIENTS[0];
  const coverStyle = {
    // Usamos backgroundImage para TUDO (imagens e gradientes são background-image em CSS)
    backgroundImage: coverValue,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div className="notion-header">
      {/* Imagem de Capa */}
      <div
        className="notion-cover"
        style={coverStyle}
      >
        <div className="notion-cover-overlay">
          <button
            className="notion-cover-btn"
            onClick={() => setShowCoverPicker(!showCoverPicker)}
            aria-label="Alterar capa"
          >
            🖼️ Alterar capa
          </button>
        </div>

        {/* Picker de capa */}
        {showCoverPicker && (
          <div className="notion-cover-picker">
            <div className="notion-cover-picker-title">Gradientes</div>
            <div className="notion-cover-picker-grid">
              {COVER_GRADIENTS.map((grad, i) => (
                <button
                  key={i}
                  className="notion-cover-picker-item"
                  style={{ background: grad }}
                  onClick={() => handleCoverSelect(grad)}
                  aria-label={`Gradiente ${i + 1}`}
                />
              ))}
            </div>
            <div style={{ padding: '0 8px 8px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', textAlign: 'center' }}>
                Upload Imagem
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'cover')} />
              </label>
              {project.coverImage && (
                <button className="btn btn-ghost btn-danger btn-sm" onClick={handleRemoveCover}>
                  Remover capa
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ícone do Projeto */}
      <div className="notion-icon-wrapper">
        <button
          className="notion-icon"
          onClick={() => setShowIconPicker(!showIconPicker)}
          aria-label="Alterar ícone"
        >
          {project?.icon && (project.icon.startsWith('/') || project.icon.startsWith('http')) ? (
            <Image
              src={project.icon}
              alt="Icon"
              width={64}
              height={64}
              unoptimized
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
            />
          ) : (
            project?.icon || '📁'
          )}
        </button>

        {/* Picker de ícone */}
        {showIconPicker && (
          <div className="notion-icon-picker">
            <div className="notion-icon-picker-title">Escolha um ícone</div>
            <div className="notion-icon-picker-grid">
              {POPULAR_ICONS.map((icon) => (
                <button
                  key={icon}
                  className="notion-icon-picker-item"
                  onClick={() => handleIconSelect(icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div style={{ padding: '8px', borderTop: '1px solid var(--border)', marginTop: '4px' }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', width: '100%', textAlign: 'center' }}>
                Upload Imagem
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'icon')} />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Título Editável */}
      <h1
        ref={titleRef}
        className="notion-title"
        contentEditable
        suppressContentEditableWarning
        onInput={handleTitleChange}
        onFocus={() => setIsEditingTitle(true)}
        onBlur={() => setIsEditingTitle(false)}
        data-placeholder="Sem título"
        role="heading"
        aria-level={1}
      >
        {project?.title || 'Sem Título'}
      </h1>
    </div>
  );
}
