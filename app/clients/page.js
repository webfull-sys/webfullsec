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
    nome_cliente: '', email: '', telefone: '', notas_contexto: '', nivel_prioridade: 3,
  });

  useEffect(() => { fetchClients(); }, [searchQuery]);

  const fetchClients = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    try {
      const res = await fetch(`/api/clients?${params}`);
      if (res.ok) { const data = await res.json(); setClients(Array.isArray(data) ? data : data.clients || []); }
    } catch { /* silencioso */ }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
    const method = editingClient ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { setShowModal(false); setEditingClient(null); setForm({ nome_cliente: '', email: '', telefone: '', notas_contexto: '', nivel_prioridade: 3 }); fetchClients(); }
    } catch { /* silencioso */ }
  };

  const deleteClient = async (id) => {
    if (!confirm('Remover este cliente? Projetos vinculados perderão a referência.')) return;
    try { await fetch(`/api/clients/${id}`, { method: 'DELETE' }); fetchClients(); } catch { /* silencioso */ }
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setForm({ nome_cliente: client.nome_cliente, email: client.email || '', telefone: client.telefone || '', notas_contexto: client.notas_contexto || '', nivel_prioridade: client.nivel_prioridade || 3 });
    setShowModal(true);
  };

  const urgencyColors = { 1: 'var(--text-secondary)', 2: 'var(--text-secondary)', 3: 'var(--accent)', 4: 'var(--warning)', 5: 'var(--danger)' };
  const urgencyLabels = { 1: 'Muito Baixa', 2: 'Baixa', 3: 'Média', 4: 'Alta', 5: 'VIP' };

  return (
    <AppShell pageTitle="Clientes">
      <div className="page-header">
        <div>
          <h2 className="page-title">👥 Clientes</h2>
          <p className="page-subtitle">{clients.length} clientes cadastrados</p>
        </div>
        <div className="page-actions">
          <input className="form-input" type="text" placeholder="Buscar cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '220px' }} />
          <button className="btn btn-primary" onClick={() => { setEditingClient(null); setForm({ nome_cliente: '', email: '', telefone: '', notas_contexto: '', nivel_prioridade: 3 }); setShowModal(true); }}>+ Novo Cliente</button>
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
                    <strong style={{ color: 'var(--text-primary)' }}>{client.nome_cliente}</strong>
                  </td>
                  <td>{client.status_cliente || '—'}</td>
                  <td>
                    <div style={{ fontSize: 'var(--text-xs)' }}>
                      {client.email && <div>📧 {client.email}</div>}
                      {client.telefone && <div>📱 {client.telefone}</div>}
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: `${urgencyColors[client.nivel_prioridade]}22`, color: urgencyColors[client.nivel_prioridade], border: `1px solid ${urgencyColors[client.nivel_prioridade]}44` }}>
                      {urgencyLabels[client.nivel_prioridade]}
                    </span>
                  </td>
                  <td className="font-mono">{client._count?.projetos || 0}</td>
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
                  <input id="cl-name" className="form-input" type="text" value={form.nome_cliente} onChange={e => setForm({ ...form, nome_cliente: e.target.value })} required autoFocus />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cl-email">E-mail</label>
                    <input id="cl-email" className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cl-phone">Telefone</label>
                    <input id="cl-phone" className="form-input" type="tel" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cl-urgency">Nível de Importância</label>
                    <select id="cl-urgency" className="form-select" value={form.nivel_prioridade} onChange={e => setForm({ ...form, nivel_prioridade: parseInt(e.target.value) })}>
                      <option value="1">⚪ Muito Baixa</option>
                      <option value="2">🟢 Baixa</option>
                      <option value="3">🟡 Média</option>
                      <option value="4">🟠 Alta</option>
                      <option value="5">🔴 VIP</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cl-notes">Notas / Contexto</label>
                  <textarea id="cl-notes" className="form-textarea" value={form.notas_contexto} onChange={e => setForm({ ...form, notas_contexto: e.target.value })} />
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
