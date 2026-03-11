'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus, X, Save, MessageSquare, Briefcase, Zap, Settings, Sparkles, Server } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppShell from '@/components/layout/AppShell';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    llmModel: 'gemini-2.0-flash',
    webhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '',
    isActive: true
  });

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data);
    } catch (error) { console.error('Erro ao buscar agentes:', error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleOpenModal = (agent = null) => {
    if (agent) {
      setFormData(agent);
    } else {
      setFormData({
        name: '', description: '', systemPrompt: '', llmModel: 'gemini-2.0-flash', webhookUrl: '', isActive: true
      });
    }
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = selectedAgent ? `/api/agents/${selectedAgent.id}` : '/api/agents';
      const method = selectedAgent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchAgents();
      }
    } catch (error) { console.error('Erro ao salvar agente:', error); }
  };

  const deleteAgent = async (id) => {
    if (!confirm('Excluir este agente definitivamente?')) return;
    try {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAgents();
    } catch (error) { console.error('Erro ao excluir:', error); }
  };

  const openChat = (agent) => {
    setSelectedAgent(agent);
    setChatHistory([]);
    setIsChatOpen(true);
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !selectedAgent) return;
    
    const userMsg = { role: 'user', content: chatMessage };
    setChatHistory(prev => [...prev, userMsg]);
    setIsSending(true);
    setChatMessage('');

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          message: userMsg.content,
          entityType: 'inbox'
        })
      });

      const data = await res.json();
      const botMsg = { 
        role: 'assistant', 
        content: data.reply || data.error || 'Operação recebida pelo cérebro N8N. Verifique o dashboard.' 
      };
      setChatHistory(prev => [...prev, botMsg]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Erro de comunicação neural. Verifique os nós do N8N.' }]);
    } finally { setIsSending(false); }
  };

  return (
    <AppShell pageTitle="Super Agentes">
      
      {/* Header Padronizado */}
      <div className="page-header">
        <div>
          <h2 className="page-title">🧠 Super Agentes</h2>
          <p className="page-subtitle">Orquestre sua equipe virtual conectada ao N8N e PostgreSQL (Pgvector).</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            + Novo Especialista
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
          {/* Card Add */}
          <div
            onClick={() => handleOpenModal()}
            style={{
              border: '2px dashed var(--border)', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: 'pointer', minHeight: '260px'
            }}
            className="hover-card"
          >
            <div style={{ width: '60px', height: '60px', background: 'var(--background)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
              <Plus size={32} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Injetar Novo Agente</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>Conecte IA a workflows n8n</p>
          </div>

          {/* Cards Agents */}
          {agents.map((agent) => (
             <div 
               key={agent.id}
               style={{
                 background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column',
                 position: 'relative'
               }}
             >
              <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
                 <button className="btn btn-secondary" onClick={() => openChat(agent)} style={{ padding: '6px' }} title="Chat com Agente">
                  <MessageSquare size={16} />
                </button>
                <button className="btn btn-secondary" onClick={() => handleOpenModal(agent)} style={{ padding: '6px' }} title="Configurações">
                  <Settings size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)',
                  background: agent.isActive ? 'var(--background)' : 'var(--border)', color: agent.isActive ? '#14b8a6' : 'var(--text-secondary)'
                }}>
                  {agent.name.toLowerCase().includes('intake') ? <Briefcase size={28} /> : <Bot size={28} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {agent.name}
                    {!agent.isActive && <span style={{ fontSize: '10px', background: 'var(--danger)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Off</span>}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--success)', fontFamily: 'monospace' }}>
                    <Server size={12} /> {agent.llmModel}
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flex: 1 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {agent.description || agent.systemPrompt.substring(0, 100) + '...'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--background)', padding: '4px 8px', borderRadius: '4px' }}>
                  <Zap size={12} style={{ color: '#f59e0b' }} />
                  {agent._count?.interactions || 0} Ações
                </span>
                <span>{formatDistanceToNow(new Date(agent.createdAt), { locale: ptBR })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Editor Agente */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
             <div className="modal-header">
               <h3 className="modal-title">{selectedAgent ? 'Configuração do Agente' : 'Programação Neural (Novo Agente)'}</h3>
               <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
             </div>
             <form onSubmit={handleSave}>
               <div className="modal-body">
                 <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Identidade *</label>
                      <input required className="form-input" type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Intake Agent (Triagem)"/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Plataforma LLM</label>
                      <select className="form-select" value={formData.llmModel} onChange={e => setFormData({...formData, llmModel: e.target.value})}>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Padrão/N8N)</option>
                        <option value="gpt-4o">OpenAI GPT-4o (N8N Vision)</option>
                        <option value="claude-3-opus">Anthropic Claude 3.5 Sonnet</option>
                      </select>
                    </div>
                 </div>

                 <div className="form-group">
                   <label className="form-label">Descrição das Habilidades</label>
                   <input className="form-input" type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ex: Ouve audios via webhook e cria projetos na aba CRM" />
                 </div>

                 <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      Regras e Treinamento (System Prompt) *
                      <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>system.role</span>
                    </label>
                    <textarea 
                      required className="form-input" 
                      style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.6' }} 
                      value={formData.systemPrompt} onChange={e => setFormData({...formData, systemPrompt: e.target.value})} 
                      placeholder="Instrua o modelo de IA sobre as tabelas e comportamentos esperados..." 
                    />
                 </div>

                 <div className="form-group">
                    <label className="form-label">N8N Webhook URL de Escuta</label>
                    <input type="url" className="form-input" value={formData.webhookUrl} onChange={e => setFormData({...formData, webhookUrl: e.target.value})} placeholder="https://n8n.../webhook/xxxx" />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Deixe em branco para forçar o uso universal do .env (Recomendado)</p>
                 </div>

                 <div style={{ background: 'var(--background)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div 
                      onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                      style={{
                        width: '44px', height: '24px', borderRadius: '12px', background: formData.isActive ? 'var(--primary)' : 'var(--border)',
                        position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                      }}
                    >
                      <div style={{
                        width: '18px', height: '18px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px',
                        left: formData.isActive ? '23px' : '3px', transition: 'left 0.3s'
                      }}/>
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Status Operacional</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Desative para pausar chamadas a este agente via UI</span>
                    </div>
                 </div>
               </div>
               <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 {selectedAgent ? (
                    <button type="button" onClick={() => deleteAgent(selectedAgent.id)} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', fontWeight: 600, cursor: 'pointer', padding: '8px' }}>
                      Desativar Permanente (Excluir)
                    </button>
                  ) : <div />}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Save size={16}/> Guardar Protocolo</button>
                  </div>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Chat Interativo Modal */}
      {isChatOpen && selectedAgent && (
        <div className="modal-backdrop" onClick={() => setIsChatOpen(false)}>
           <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
             <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', padding: 'var(--space-md)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                 <div style={{ width: '40px', height: '40px', background: 'var(--background)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                    <Bot size={20} style={{ color: '#14b8a6' }} />
                 </div>
                 <div>
                   <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{selectedAgent.name}</h3>
                   <span style={{ fontSize: '0.75rem', color: '#14b8a6', fontFamily: 'monospace' }}>Comunicação Segura via N8N</span>
                 </div>
               </div>
               <button className="modal-close" onClick={() => setIsChatOpen(false)}>×</button>
             </div>

             <div style={{ flex: 1, padding: 'var(--space-md)', overflowY: 'auto', background: '#09090b', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
               {chatHistory.length === 0 ? (
                 <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)' }}>
                   <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: 'var(--space-sm)' }} />
                   <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Inicie a transmissão</h4>
                   <p style={{ fontSize: '0.85rem' }}>Envie uma instrução textual. O n8n processará conforme a programação.</p>
                 </div>
               ) : (
                 chatHistory.map((msg, i) => (
                   <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                     <div style={{ 
                       maxWidth: '85%', padding: '12px 16px', borderRadius: '16px', fontSize: '0.9rem', lineHeight: '1.5',
                       background: msg.role === 'user' ? '#14b8a6' : '#18181b', color: msg.role === 'user' ? '#000' : '#e4e4e7',
                       borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px', borderTopLeftRadius: msg.role === 'user' ? '16px' : '4px'
                     }}>
                       {typeof msg.content === 'object' ? <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>{JSON.stringify(msg.content, null, 2)}</pre> : <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>}
                     </div>
                   </div>
                 ))
               )}
               {isSending && (
                 <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ background: '#18181b', padding: '12px 16px', borderRadius: '16px', borderTopLeftRadius: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                       <div style={{ width: '8px', height: '8px', background: '#14b8a6', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                       <div style={{ width: '8px', height: '8px', background: '#14b8a6', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.2s' }} />
                       <div style={{ width: '8px', height: '8px', background: '#14b8a6', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.4s' }} />
                    </div>
                 </div>
               )}
             </div>

             <div style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
               <form onSubmit={e => { e.preventDefault(); sendChatMessage(); }} style={{ display: 'flex', gap: '8px' }}>
                 <input 
                   type="text" 
                   value={chatMessage} onChange={e => setChatMessage(e.target.value)} 
                   placeholder="Dispare um evento neural..." 
                   className="form-input" 
                   style={{ flex: 1, paddingRight: '12px' }}
                 />
                 <button type="submit" className="btn btn-primary" disabled={!chatMessage.trim() || isSending} style={{ padding: '10px', background: '#14b8a6', color: '#000' }}>
                   <Zap size={20} />
                 </button>
               </form>
             </div>
           </div>
        </div>
      )}

    </AppShell>
  );
}
