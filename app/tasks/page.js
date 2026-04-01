'use client';

/**
 * ============================================
 * WebfullSec — Página de Tarefas
 * CRUD completo com filtros e formulário modal
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 */

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { formatDate, formatMinutes, getPriorityColor, getPriorityLabel, getStatusLabel } from '@/lib/utils';
import { TASK_STATUSES, PRIORITY_LEVELS } from '@/lib/constants';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  const [openGroups, setOpenGroups] = useState({});

  // Estado do formulário
  const [form, setForm] = useState({
    title: '', description: '', priority: 2,
    estimatedTime: '', doDate: '', dueDate: '', projectId: '',
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    try {
      const res = await fetch(`/api/tasks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch { /* silencioso */ }
    setLoading(false);
  }, [filter]);

  // Carregar tarefas
  useEffect(() => {
    const timer = setTimeout(fetchTasks, 0);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  // Criar/Editar tarefa
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
    const method = editingTask ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          estimatedTime: form.estimatedTime ? parseInt(form.estimatedTime) : null,
          doDate: form.doDate || null,
          dueDate: form.dueDate || null,
          projectId: form.projectId || null,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setEditingTask(null);
        setForm({ title: '', description: '', priority: 2, estimatedTime: '', doDate: '', dueDate: '', projectId: '' });
        fetchTasks();
      }
    } catch { /* silencioso */ }
  };

  // Toggle status
  const toggleTask = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch { /* silencioso */ }
  };

  // Deletar
  const deleteTask = async (id) => {
    if (!confirm('Tem certeza que deseja remover esta tarefa?')) return;
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      fetchTasks();
    } catch { /* silencioso */ }
  };

  // Abrir modal de edição
  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      estimatedTime: task.estimatedTime?.toString() || '',
      doDate: task.doDate ? task.doDate.split('T')[0] : '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      projectId: task.projectId || '',
    });
    setShowModal(true);
  };

  const groupedTasks = Object.entries(
    tasks.reduce((acc, task) => {
      const projectTitle = task.project?.title || 'Avulsas (Sem Projeto)';
      if (!acc[projectTitle]) acc[projectTitle] = [];
      acc[projectTitle].push(task);
      return acc;
    }, {})
  );

  return (
    <AppShell pageTitle="Tarefas">
      {/* Header da página */}
      <div className="page-header">
        <div>
          <h2 className="page-title">✅ Tarefas</h2>
          <p className="page-subtitle">{tasks.length} tarefas no total</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditingTask(null); setForm({ title: '', description: '', priority: 2, estimatedTime: '', doDate: '', dueDate: '', projectId: '' }); setShowModal(true); }}>
            + Nova Tarefa
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todas</button>
        {TASK_STATUSES.map(s => (
          <button key={s.value} className={`tab ${filter === s.value ? 'active' : ''}`} onClick={() => setFilter(s.value)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Lista de tarefas */}
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <p className="empty-state-title">Nenhuma tarefa encontrada</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nova Tarefa</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {groupedTasks.map(([projectTitle, projectTasks]) => (
            <details
              key={projectTitle}
              className="project-group"
              open={!!openGroups[projectTitle]}
              onToggle={(e) => {
                const isOpen = e.currentTarget.open;
                setOpenGroups(prev => ({
                  ...prev,
                  [projectTitle]: isOpen,
                }));
              }}
            >
              <summary style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', cursor: 'pointer', outline: 'none', userSelect: 'none' }}>
                📁 {projectTitle} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.7 }}>({projectTasks.length})</span>
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: '8px' }}>
                {projectTasks.map(task => (
                  <div key={task.id} className="task-item">
                    <button className={`task-check ${task.status === 'done' ? 'done' : ''}`} onClick={() => toggleTask(task)} aria-label="Toggle tarefa" />
                    <div className="task-info" onClick={() => openEdit(task)} style={{ cursor: 'pointer' }}>
                      <div className={`task-title ${task.status === 'done' ? 'done' : ''}`}>{task.title}</div>
                      <div className="task-meta">
                        <span className="task-priority-dot" style={{ background: getPriorityColor(task.priority) }} />
                        <span>{getPriorityLabel(task.priority)}</span>
                        {task.estimatedTime && <span>⏱ {formatMinutes(task.estimatedTime)}</span>}
                        {task.doDate && <span>📅 {formatDate(task.doDate)}</span>}
                      </div>
                    </div>
                    <div className="task-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(task)} title="Editar">✏️</button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteTask(task.id)} title="Remover">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="task-title">Título *</label>
                  <input id="task-title" className="form-input" type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required autoFocus placeholder="Ex: Design da landing page" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="task-desc">Descrição</label>
                  <textarea id="task-desc" className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detalhes da tarefa..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-priority">Prioridade</label>
                    <select id="task-priority" className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })}>
                      {PRIORITY_LEVELS.map(p => (
                        <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-time">Tempo Estimado (min)</label>
                    <input id="task-time" className="form-input" type="number" value={form.estimatedTime} onChange={e => setForm({ ...form, estimatedTime: e.target.value })} placeholder="30" min="1" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-do">Do Date (Fazer em)</label>
                    <input id="task-do" className="form-input" type="date" value={form.doDate} onChange={e => setForm({ ...form, doDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-due">Due Date (Prazo)</label>
                    <input id="task-due" className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingTask ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
