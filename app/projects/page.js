/**
 * ============================================
 * WebfullSec — Projetos (Listagem com Múltiplas Visualizações)
 * Kanban | Tabela | Timeline com filtros e busca
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.9.0
 * ============================================
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import KanbanBoard from '@/components/projects/KanbanBoard';
import ProjectTable from '@/components/projects/ProjectTable';
import TimelineView from '@/components/projects/TimelineView';
import { PROJECT_STATUSES, PROJECT_CATEGORIES } from '@/lib/constants';

const VIEW_MODES = [
  { value: 'kanban', label: 'Kanban', icon: '◫' },
  { value: 'table', label: 'Tabela', icon: '☰' },
  { value: 'timeline', label: 'Timeline', icon: '⟶' },
];

const ICONS = ['📁', '🚀', '💻', '🌐', '⚡', '🎵', '🎨', '📊', '🔧', '📱', '🏗️', '📋', '🎯', '🔒', '💡', '🟦', '⚛️', '🟢', '🐘', '🦁', '🐍', '🔵', '🦀', '🛒'];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalTab, setModalTab] = useState('pc'); // 'pc' | 'manual'

  // Aba "Importar do PC"
  const [folderPath, setFolderPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');

  // Formulário (ambas as abas)
  const [newProject, setNewProject] = useState({
    title: '', category: 'site', priority: 2, icon: '📁', localPath: '',
  });
  const [creating, setCreating] = useState(false);

  const resetModal = useCallback(() => {
    setModalTab('pc');
    setFolderPath('');
    setScanResult(null);
    setScanError('');
    setNewProject({ title: '', category: 'site', priority: 2, icon: '📁', localPath: '' });
    setCreating(false);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Erro ao buscar projetos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [projects, filterStatus, filterCategory, searchQuery]);

  const handleUpdateStatus = useCallback(async (projectId, newStatus) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
    );
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      fetchProjects();
    }
  }, [fetchProjects]);

  // =============================================
  // Aba PC — Scan da pasta
  // =============================================
  const handleScanFolder = useCallback(async () => {
    if (!folderPath.trim()) return;
    setScanning(true);
    setScanResult(null);
    setScanError('');
    try {
      const res = await fetch('/api/projects/scan-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: folderPath.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error || 'Erro ao escanear pasta.');
        return;
      }
      const d = data.detected;
      setScanResult(d);
      // Preenche automaticamente o formulário com os dados detectados
      setNewProject({
        title: d.name,
        category: d.type === 'wordpress' ? 'site' : 'app',
        priority: 2,
        icon: d.icon,
        localPath: d.path,
        description: `## Projeto importado do PC\n\n**Caminho:** ${d.path}\n**Tipo:** ${d.type}\n**Tech Stack:** ${d.techStack?.join(', ') || 'N/A'}\n**Arquivos:** ${d.fileCount}${d.gitRepo ? `\n**Git:** ${d.gitRepo}` : ''}${d.themeName ? `\n**Tema WP:** ${d.themeName}` : ''}`,
        tags: [d.type, 'importado', ...(d.techStack || [])],
      });
    } catch (err) {
      setScanError(`Erro de conexão: ${err.message}`);
    } finally {
      setScanning(false);
    }
  }, [folderPath]);

  // =============================================
  // Criação do projeto (ambas as abas)
  // =============================================
  const handleCreateProject = useCallback(async () => {
    if (!newProject.title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      if (res.ok) {
        const created = await res.json();

        // Se tem caminho local, vincula via ProjectLink
        if (newProject.localPath) {
          await fetch('/api/projetoswebfull/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upsertProject',
              project: {
                name: newProject.title,
                path: newProject.localPath,
                type: scanResult?.type || 'generic',
                techStack: scanResult?.techStack || [],
                gitRepo: scanResult?.gitRepo || null,
                fileCount: scanResult?.fileCount || 0,
              },
            }),
          });
        }

        setShowNewModal(false);
        resetModal();
        router.push(`/projects/${created.id}`);
      }
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
    } finally {
      setCreating(false);
    }
  }, [newProject, scanResult, router, resetModal]);

  return (
    <AppShell pageTitle="Projetos">
      <div className="projects-page">
        <div className="projects-header">
          <div className="projects-header-left">
            <div className="view-switcher" role="tablist" aria-label="Modo de visualização">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.value}
                  className={`view-switcher-btn ${viewMode === mode.value ? 'active' : ''}`}
                  onClick={() => setViewMode(mode.value)}
                  role="tab"
                  aria-selected={viewMode === mode.value}
                  title={mode.label}
                >
                  <span className="view-switcher-icon">{mode.icon}</span>
                  <span className="view-switcher-label">{mode.label}</span>
                </button>
              ))}
            </div>
            <div className="projects-filters">
              <select
                className="projects-filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filtrar por status"
              >
                <option value="all">Todos os Status</option>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                ))}
              </select>
              <select
                className="projects-filter-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                aria-label="Filtrar por categoria"
              >
                <option value="all">Todas Categorias</option>
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="projects-header-right">
            <div className="projects-search">
              <span className="projects-search-icon">🔍</span>
              <input
                type="text"
                className="projects-search-input"
                placeholder="Buscar projetos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar projetos"
              />
            </div>

            <button className="btn btn-primary" onClick={() => { resetModal(); setShowNewModal(true); }}>
              + Novo Projeto
            </button>
          </div>
        </div>
        <div className="projects-count">
          <span className="text-muted">
            {filteredProjects.length} projeto{filteredProjects.length !== 1 ? 's' : ''}
            {filterStatus !== 'all' || filterCategory !== 'all' || searchQuery ? ' (filtrado)' : ''}
          </span>
        </div>
        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : (
          <>
            {viewMode === 'kanban' && <KanbanBoard projects={filteredProjects} onUpdateStatus={handleUpdateStatus} />}
            {viewMode === 'table' && <ProjectTable projects={filteredProjects} />}
            {viewMode === 'timeline' && <TimelineView projects={filteredProjects} />}
          </>
        )}
        {showNewModal && (
          <div
            className="modal-backdrop"
            onClick={() => { setShowNewModal(false); resetModal(); }}
            role="dialog"
            aria-modal="true"
            aria-label="Criar novo projeto"
          >
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '560px', width: '100%' }}
            >
              <div className="modal-header">
                <h2 className="modal-title">📁 Novo Projeto</h2>
                <button className="modal-close" onClick={() => { setShowNewModal(false); resetModal(); }} aria-label="Fechar">×</button>
              </div>

              {/* Abas */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
                {[
                  { key: 'pc', label: '🖥️ Importar do PC', title: 'Adicionar projeto de uma pasta do seu computador' },
                  { key: 'manual', label: '✏️ Criar Manual', title: 'Criar um projeto vazio manualmente' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    title={tab.title}
                    onClick={() => setModalTab(tab.key)}
                    style={{
                      flex: 1,
                      padding: '0.65rem 1rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: modalTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                      color: modalTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                      fontWeight: modalTab === tab.key ? 600 : 400,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="modal-body">

                {/* ABA: IMPORTAR DO PC */}
                {modalTab === 'pc' && (
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                      Digite ou cole o caminho completo da pasta do projeto no seu PC. O sistema detecta automaticamente o tipo, tech stack e cria o projeto.
                    </p>

                    {/* Campo de caminho */}
                    <div className="form-group">
                      <label className="form-label">📂 Caminho da Pasta</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          id="folder-path-input"
                          type="text"
                          className="form-input"
                          placeholder="Ex: D:\MeusProjetos\meu-site"
                          value={folderPath}
                          onChange={(e) => { setFolderPath(e.target.value); setScanResult(null); setScanError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && handleScanFolder()}
                          autoFocus
                          style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                          aria-label="Caminho da pasta do projeto"
                        />
                        <button
                          className="btn btn-primary"
                          onClick={handleScanFolder}
                          disabled={!folderPath.trim() || scanning}
                          style={{ whiteSpace: 'nowrap', minWidth: '100px' }}
                        >
                          {scanning ? '⏳ Lendo...' : '🔍 Detectar'}
                        </button>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                        💡 Dica: No Windows Explorer, copie o endereço da barra de localização (ex: <code style={{ background: 'var(--bg-hover)', padding: '1px 4px', borderRadius: '3px' }}>D:\Projetos\meu-app</code>)
                      </p>
                    </div>

                    {/* Erro de scan */}
                    {scanError && (
                      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        ❌ {scanError}
                      </div>
                    )}

                    {/* Resultado do scan */}
                    {scanResult && (
                      <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '2rem' }}>{scanResult.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{scanResult.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{scanResult.path}</div>
                          </div>
                          {scanResult.alreadyExists && (
                            <span style={{ marginLeft: 'auto', background: 'rgba(250,204,21,0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                              ⚠️ Já existe
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <span style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {scanResult.type}
                          </span>
                          {(scanResult.techStack || []).map((tech) => (
                            <span key={tech} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {tech}
                            </span>
                          ))}
                          {scanResult.gitRepo && (
                            <span style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem' }}>
                              🔗 Git
                            </span>
                          )}
                          <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            {scanResult.fileCount} arquivos
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Ajuste do nome após scan */}
                    {scanResult && (
                      <div className="form-group">
                        <label className="form-label">Nome do Projeto</label>
                        <input
                          type="text"
                          className="form-input"
                          value={newProject.title}
                          onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                          placeholder="Nome do projeto"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ABA: CRIAR MANUAL */}
                {modalTab === 'manual' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Título do Projeto</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: Website Empresa XYZ"
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Categoria</label>
                      <select
                        className="form-input"
                        value={newProject.category}
                        onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                      >
                        {PROJECT_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Caminho Local <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: D:\MeusProjetos\meu-site"
                        value={newProject.localPath || ''}
                        onChange={(e) => setNewProject({ ...newProject, localPath: e.target.value })}
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                )}

                {/* Seletor de ícone (ambas as abas) */}
                {(modalTab === 'manual' || scanResult) && (
                  <div className="form-group">
                    <label className="form-label">Ícone</label>
                    <div className="notion-icon-picker-grid" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
                      {ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className={`notion-icon-picker-item ${newProject.icon === icon ? 'active' : ''}`}
                          style={newProject.icon === icon ? { background: 'var(--accent-glow)', border: '1px solid var(--accent)' } : {}}
                          onClick={() => setNewProject({ ...newProject, icon })}
                          aria-label={`Ícone ${icon}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => { setShowNewModal(false); resetModal(); }}>Cancelar</button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateProject}
                  disabled={!newProject.title.trim() || creating || (modalTab === 'pc' && !scanResult)}
                >
                  {creating ? '⏳ Criando...' : '✅ Criar Projeto'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}