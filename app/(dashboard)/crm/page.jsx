'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Briefcase, Plus, X, Save, Calendar, Clock, Server } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppShell from '@/components/layout/AppShell';

export default function CrmPage() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Form State Project
  const [projectForm, setProjectForm] = useState({
    titulo_projeto: '', cliente_id: '', categoria: 'Site', due_date_cliente: '', prioridade: 'Normal'
  });

  // Form State Client
  const [clientForm, setClientForm] = useState({
    nome_cliente: '', email: '', telefone: '', nivel_prioridade: '3'
  });

  const fetchData = async () => {
    try {
      const [projRes, cliRes] = await Promise.all([fetch('/api/projects'), fetch('/api/clients')]);
      const projData = await projRes.json();
      const cliData = await cliRes.json();
      setProjects(projData);
      setClients(cliData);
    } catch (error) {
      console.error('Erro ao buscar CRM:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProject = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectForm)
      });
      if (res.ok) {
        setIsProjectModalOpen(false);
        setProjectForm({ titulo_projeto: '', cliente_id: '', categoria: 'Site', due_date_cliente: '', prioridade: 'Normal' });
        fetchData();
      }
    } catch (error) { console.error(error); }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clientForm)
      });
      if (res.ok) {
        setIsClientModalOpen(false);
        setClientForm({ nome_cliente: '', email: '', telefone: '', nivel_prioridade: '3' });
        fetchData();
      }
    } catch (error) { console.error(error); }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Baixa': return 'var(--text-secondary)';
      case 'Normal': return 'var(--primary)';
      case 'Alta': return '#f59e0b'; // amber
      case 'Urgente': return 'var(--danger)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <AppShell pageTitle="CRM & Projetos">
      
      {/* Header Padronizado */}
      <div className="page-header">
        <div>
          <h2 className="page-title">💼 CRM & Projetos</h2>
          <p className="page-subtitle">Visão consolidada de Clientes e gerenciamento preditivo de Entregas (N8N IA).</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setIsClientModalOpen(true)} style={{ border: '1px solid var(--border)'}}>
            + Novo Cliente
          </button>
          <button className="btn btn-primary" onClick={() => setIsProjectModalOpen(true)}>
            + Novo Projeto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 'var(--space-lg)' }}>
            Projetos em Esteira
          </h3>
          
          {projects.length === 0 ? (
             <div className="empty-state">
               <div className="empty-state-icon">💼</div>
               <p className="empty-state-title">Nenhum projeto encontrado</p>
               <button className="btn btn-primary" onClick={() => setIsProjectModalOpen(true)}>+ Criar Projeto</button>
             </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
              {projects.map(proj => (
                <div 
                  key={proj.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xs)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{proj.titulo_projeto}</h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', border: '1px solid currentColor', color: getPriorityColor(proj.prioridade) }}>
                      {proj.prioridade}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <Users size={14} /> {proj.cliente?.nome_cliente || 'Sem Cliente'} • {proj.categoria}
                  </div>

                  <div style={{ 
                    marginTop: 'var(--space-sm)', 
                    padding: 'var(--space-sm)', 
                    background: 'var(--background)', 
                    borderRadius: 'var(--radius-md)',
                    display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Due Date (Cliente):</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{proj.due_date_cliente ? format(new Date(proj.due_date_cliente), 'dd/MM/yyyy') : 'Sem Prazo'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>ETA (IA):</span>
                      <strong style={{ color: 'var(--primary)' }}>{proj.eta_previsao_ia ? format(new Date(proj.eta_previsao_ia), 'dd/MM/yyyy') : 'Calculando...'}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>Status: <strong style={{ color: 'var(--text-primary)'}}>{proj.status_projeto}</strong></span>
                    <span>{formatDistanceToNow(new Date(proj.criado_em), { locale: ptBR })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Projeto (usando o CSS do modal do sistema) */}
      {isProjectModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsProjectModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Novo Projeto</h3>
              <button className="modal-close" onClick={() => setIsProjectModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveProject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="pj-title">Título do Projeto *</label>
                  <input id="pj-title" required className="form-input" type="text" value={projectForm.titulo_projeto} onChange={e => setProjectForm({...projectForm, titulo_projeto: e.target.value})} placeholder="Ex: Landing Page Tech" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cliente (Dono) *</label>
                    <select required className="form-select" value={projectForm.cliente_id} onChange={e => setProjectForm({...projectForm, cliente_id: e.target.value})}>
                      <option value="">Selecione um cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome_cliente}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <select className="form-select" value={projectForm.categoria} onChange={e => setProjectForm({...projectForm, categoria: e.target.value})}>
                      <option value="Site">Desenvolvimento de Site</option>
                      <option value="Automacao">Fluxo de Automação</option>
                      <option value="Beat">Beat Completo (Música)</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Prioridade</label>
                    <select className="form-select" value={projectForm.prioridade} onChange={e => setProjectForm({...projectForm, prioridade: e.target.value})}>
                      <option value="Baixa">Baixa</option>
                      <option value="Normal">Normal</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date (Prazo Final Cliente)</label>
                    <input type="date" className="form-input" value={projectForm.due_date_cliente} onChange={e => setProjectForm({...projectForm, due_date_cliente: e.target.value})} />
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'var(--background)', borderRadius: 'var(--radius-sm)' }}>
                  O campo de ETA (Do Date) será calculado pelos Agentes N8N.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsProjectModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Projeto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cliente */}
      {isClientModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsClientModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Novo Cliente</h3>
              <button className="modal-close" onClick={() => setIsClientModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveClient}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome do Cliente / Empresa *</label>
                  <input required className="form-input" type="text" value={clientForm.nome_cliente} onChange={e => setClientForm({...clientForm, nome_cliente: e.target.value})} placeholder="Ex: Microsoft" />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" type="email" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} placeholder="email@empresa.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Whatsapp / Celular</label>
                  <input className="form-input" type="tel" value={clientForm.telefone} onChange={e => setClientForm({...clientForm, telefone: e.target.value})} placeholder="+551199999999" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsClientModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AppShell>
  );
}
