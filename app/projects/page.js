'use client';

/**
 * ============================================
 * WebfullSec — Página de Projetos
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 */

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { PROJECT_CATEGORIES, PROJECT_STATUSES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [catFilter, setCatFilter] = useState('all');
  const [form, setForm] = useState({
    title: '', description: '', category: 'site', priority: 2, clientId: '', startDate: '', dueDate: '',
  });

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [catFilter]);

  const fetchProjects = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (catFilter !== 'all') params.set('category', catFilter);
    try {
      const res = await fetch(`/api/projects?${params}`);
      if (res.ok) { const data = await res.json(); setProjects(data.projects || []); }
    } catch { /* silencioso */ }
    setLoading(false);
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients?active=true');
      if (res.ok) { const data = await res.json(); setClients(data.clients || []); }
    } catch { /* silencioso */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          clientId: form.clientId || null,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
        }),
      });
      if (res.ok) { setShowModal(false); setForm({ title: '', description: '', category: 'site', priority: 2, clientId: '', startDate: '', dueDate: '' }); fetchProjects(); }
    } catch { /* silencioso */ }
  };

  const getCatIcon = (cat) => {
    const found = PROJECT_CATEGORIES.find(c => c.value === cat);
    return found?.label?.split(' ')[0] || '📁';
  };

  const getStatusBadge = (status) => {
    const found = PROJECT_STATUSES.find(s => s.value === status);
    const classMap = {
      planning: 'badge-muted', in_progress: 'badge-accent',
      review: 'badge-warning', completed: 'badge-success', archived: 'badge-muted',
    };
    return <span className={`badge ${classMap[status] || 'badge-muted'}`}>{found?.label || status}</span>;
  };

  return (
    <AppShell pageTitle="Projetos">
      <div className="page-header">
        <div>
          <h2 className="page-title">📁 Projetos</h2>
          <p className="page-subtitle">{projects.length} projetos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Novo Projeto</button>
      </div>

      <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
        <button className={`tab ${catFilter === 'all' ? 'active' : ''}`} onClick={() => setCatFilter('all')}>Todos</button>
        {PROJECT_CATEGORIES.map(c => (
          <button key={c.value} className={`tab ${catFilter === c.value ? 'active' : ''}`} onClick={() => setCatFilter(c.value)}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <p className="empty-state-title">Nenhum projeto encontrado</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Novo Projeto</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-md)' }}>
          {projects.map(project => {
            const completedTasks = project._count?.completedTasks || 0;
            const totalTasks = project._count?.tasks || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
              <a key={project.id} href={`/projects/${project.id}`} className="card" style={{ textDecoration: 'none', display: 'block' }}>
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ fontSize: 'var(--text-xl)' }}>{getCatIcon(project.category)}</span>
                    <h3 className="card-title">{project.title}</h3>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
                {project.description && (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.description}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                  <span>👤 {project.client?.name || 'Sem cliente'}</span>
                  <span className="font-mono">{completedTasks}/{totalTasks} tarefas</span>
                </div>
                {totalTasks > 0 && (
                  <div className="progress-bar">
                    <div className={`progress-fill ${progress === 100 ? 'success' : progress > 80 ? 'warning' : ''}`} style={{ width: `${progress}%` }} />
                  </div>
                )}
              </a>
            );
          })}
        </div>
      )}

      {/* Modal Criar */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Novo Projeto</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="proj-title">Título *</label>
                  <input id="proj-title" className="form-input" type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="proj-desc">Descrição</label>
                  <textarea id="proj-desc" className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-cat">Categoria</label>
                    <select id="proj-cat" className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {PROJECT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-client">Cliente</label>
                    <select id="proj-client" className="form-select" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                      <option value="">Nenhum</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-start">Data Início</label>
                    <input id="proj-start" className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-due">Prazo</label>
                    <input id="proj-due" className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar Projeto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
