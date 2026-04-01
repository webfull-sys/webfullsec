'use client';

/**
 * ============================================
 * WebfullSec — Página de Caixa de Entrada (Inbox)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 */

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { INBOX_SOURCES } from '@/lib/constants';

export default function InboxPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [form, setForm] = useState({ title: '', content: '', source: 'manual', priority: 2 });
  const [nowTs, setNowTs] = useState(() => Date.now());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    try {
      const res = await fetch(`/api/inbox?${params}`);
      if (res.ok) { const data = await res.json(); setItems(data.items || []); }
    } catch { /* silencioso */ }
    setLoading(false);
  }, [sourceFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchItems, 0);
    return () => clearTimeout(timer);
  }, [fetchItems]);
  useEffect(() => {
    const interval = setInterval(() => setNowTs(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowModal(false); setForm({ title: '', content: '', source: 'manual', priority: 2 }); fetchItems(); }
    } catch { /* silencioso */ }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`/api/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      setItems(prev => prev.map(i => i.id === id ? { ...i, isRead: true } : i));
    } catch { /* silencioso */ }
  };

  const archiveItem = async (id) => {
    try {
      await fetch(`/api/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch { /* silencioso */ }
  };

  const getSourceIcon = (source) => {
    const found = INBOX_SOURCES.find(s => s.value === source);
    return found?.icon || '📄';
  };

  const timeSince = (dateStr) => {
    const diff = nowTs - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}min atrás`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h atrás`;
    return `${Math.floor(h / 24)}d atrás`;
  };

  return (
    <AppShell pageTitle="Caixa de Entrada">
      <div className="page-header">
        <div>
          <h2 className="page-title">📥 Caixa de Entrada</h2>
          <p className="page-subtitle">{items.filter(i => !i.isRead).length} não lidos</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Novo Item</button>
        </div>
      </div>

      {/* Filtros por fonte */}
      <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
        <button className={`tab ${sourceFilter === 'all' ? 'active' : ''}`} onClick={() => setSourceFilter('all')}>Todos</button>
        {INBOX_SOURCES.map(s => (
          <button key={s.value} className={`tab ${sourceFilter === s.value ? 'active' : ''}`} onClick={() => setSourceFilter(s.value)}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-title">Inbox vazia</p>
          <p className="empty-state-text">Nenhum item pendente. Itens do n8n aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {items.map(item => (
            <div key={item.id} className={`inbox-item ${!item.isRead ? 'unread' : ''}`} onClick={() => markAsRead(item.id)}>
              <div className="inbox-source-icon">{getSourceIcon(item.source)}</div>
              <div className="inbox-content">
                <div className="inbox-title">{item.title}</div>
                {item.content && <div className="inbox-preview">{item.content}</div>}
              </div>
              <div className="inbox-time">{timeSince(item.createdAt)}</div>
              <div className="task-actions" style={{ opacity: 1 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); archiveItem(item.id); }} title="Arquivar">📦</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Novo Item</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="inbox-title">Título *</label>
                  <input id="inbox-title" className="form-input" type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="inbox-content">Conteúdo</label>
                  <textarea id="inbox-content" className="form-textarea" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="inbox-source">Fonte</label>
                  <select id="inbox-source" className="form-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                    {INBOX_SOURCES.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
