'use client';

/**
 * ============================================
 * WebfullSec — Página de Clientes
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 */

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { PRIORITY_LEVELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', urgencyLevel: 1, notes: '',
  });

  useEffect(() => { fetchClients(); }, [searchQuery]);

  const fetchClients = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    try {
      const res = await fetch(`/api/clients?${params}`);
      if (res.ok) { const data = await res.json(); setClients(data.clients || []); }
    } catch { /* silencioso */ }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
    const method = editingClient ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { setShowModal(false); setEditingClient(null); setForm({ name: '', email: '', phone: '', company: '', urgencyLevel: 1, notes: '' }); fetchClients(); }
    } catch { /* silencioso */ }
  };

  const deleteClient = async (id) => {
    if (!confirm('Remover este cliente? Projetos vinculados perderão a referência.')) return;
    try { await fetch(`/api/clients/${id}`, { method: 'DELETE' }); fetchClients(); } catch { /* silencioso */ }
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setForm({ name: client.name, email: client.email || '', phone: client.phone || '', company: client.company || '', urgencyLevel: client.urgencyLevel, notes: client.notes || '' });
    setShowModal(true);
  };

  const urgencyColors = { 1: 'var(--text-secondary)', 2: 'var(--accent)', 3: 'var(--warning)', 4: 'var(--danger)' };
  const urgencyLabels = { 1: 'Baixa', 2: 'Média', 3: 'Alta', 4: 'Crítica' };

  return (
    <AppShell pageTitle="Clientes">
      <div className="page-header">
        <div>
          <h2 className="page-title">👥 Clientes</h2>
          <p className="page-subtitle">{clients.length} clientes cadastrados</p>
        </div>
        <div className="page-actions">
          <input className="form-input" type="text" placeholder="Buscar cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '220px' }} />
          <button className="btn btn-primary" onClick={() => { setEditingClient(null); setForm({ name: '', email: '', phone: '', company: '', urgencyLevel: 1, notes: '' }); setShowModal(true); }}>+ Novo Cliente</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : clients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <p className="empty-state-title">Nenhum cliente encontrado</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Novo Cliente</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Empresa</th>
                <th>Contato</th>
                <th>Urgência</th>
                <th>Projetos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{client.name}</strong>
                  </td>
                  <td>{client.company || '—'}</td>
                  <td>
                    <div style={{ fontSize: 'var(--text-xs)' }}>
                      {client.email && <div>📧 {client.email}</div>}
                      {client.phone && <div>📱 {client.phone}</div>}
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: `${urgencyColors[client.urgencyLevel]}22`, color: urgencyColors[client.urgencyLevel], border: `1px solid ${urgencyColors[client.urgencyLevel]}44` }}>
                      {urgencyLabels[client.urgencyLevel]}
                    </span>
                  </td>
                  <td className="font-mono">{client._count?.projects || 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(client)} title="Editar">✏️</button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteClient(client.id)} title="Remover">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="cl-name">Nome *</label>
                  <input id="cl-name" className="form-input" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cl-email">E-mail</label>
                    <input id="cl-email" className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cl-phone">Telefone</label>
                    <input id="cl-phone" className="form-input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cl-company">Empresa</label>
                    <input id="cl-company" className="form-input" type="text" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cl-urgency">Urgência</label>
                    <select id="cl-urgency" className="form-select" value={form.urgencyLevel} onChange={e => setForm({ ...form, urgencyLevel: parseInt(e.target.value) })}>
                      {PRIORITY_LEVELS.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cl-notes">Notas</label>
                  <textarea id="cl-notes" className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingClient ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
