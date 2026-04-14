/**
 * ============================================
 * WebfullSec — Projetos (Listagem com Múltiplas Visualizações)
 * Kanban | Tabela | Timeline com filtros e busca
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
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

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanPath, setScanPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', category: 'site', priority: 2, icon: '📁' });

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

  const handleCreateProject = useCallback(async () => {
    if (!newProject.title.trim()) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      if (res.ok) {
        const created = await res.json();
        setShowNewModal(false);
        setNewProject({ title: '', category: 'site', priority: 2, icon: '📁' });
        router.push(`/projects/${created.id}`);
      }
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
    }
  }, [newProject, router]);

  const handleScanProject = useCallback(async () => {
    if (!scanPath.trim()) return;
    setScanning(true);
    try {
      const res = await fetch('/api/custom/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: scanPath.trim(), options: { createAgent: true } }),
      });
      const data = await res.json();
      if (data.success) {
        setShowScanModal(false);
        setScanPath('');
        fetchProjects();
        router.push(`/projects/${data.projectId}`);
      } else {
        alert('Erro ao escanear: ' + data.error);
      }
    } catch (err) {
      console.error('Erro ao escanear:', err);
    } finally {
      setScanning(false);
    }
  }, [scanPath, router, fetchProjects]);

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
            <button className="btn btn-secondary" onClick={() => setShowScanModal(true)} title="Escanear projeto">
              📂 Escanear
            </button>
            <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
              + Nova Página
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
          <div className="modal-backdrop" onClick={() => setShowNewModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">📁 Nova Página de Projeto</h2>
                <button className="modal-close" onClick={() => setShowNewModal(false)}>×</button>
              </div>
              <div className="modal-body">
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
                  <label className="form-label">Ícone</label>
                  <div className="notion-icon-picker-grid" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
                    {['📁', '🚀', '💻', '🌐', '⚡', '🎵', '🎨', '📊', '🔧', '📱', '🏗️', '📋', '🎯', '🔒', '💡'].map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={`notion-icon-picker-item ${newProject.icon === icon ? 'active' : ''}`}
                        style={newProject.icon === icon ? { background: 'var(--accent-glow)', border: '1px solid var(--accent)' } : {}}
                        onClick={() => setNewProject({ ...newProject, icon })}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowNewModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleCreateProject} disabled={!newProject.title.trim()}>
                  Criar Projeto
                </button>
              </div>
            </div>
          </div>
        )}
        {showScanModal && (
          <div className="modal-backdrop" onClick={() => setShowScanModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">📂 Escanear Projeto</h2>
                <button className="modal-close" onClick={() => setShowScanModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Caminho da pasta do projeto</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="D:\VibeCoding\ProjSitesAI\plataforma-ead"
                    value={scanPath}
                    onChange={(e) => setScanPath(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanProject()}
                  />
                  <p className="form-help">Cole o caminho completo da pasta</p>
                </div>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setScanPath('D:\\VibeCoding\\ProjSitesAI\\plataforma-ead')}
                >
                  📁 Plataforma EAD
                </button>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowScanModal(false)}>Cancelar</button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleScanProject} 
                  disabled={!scanPath.trim() || scanning}
                >
                  {scanning ? 'Escaneando...' : 'Escanear'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}