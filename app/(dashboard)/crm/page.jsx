'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Briefcase, Plus, X, Save, Calendar, Clock, ArrowLeft, MoreVertical, Server } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

export default function CrmPage() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Form State Project
  const [projectForm, setProjectForm] = useState({
    titulo_projeto: '',
    cliente_id: '',
    categoria: 'Site',
    due_date_cliente: '',
    prioridade: 'Normal'
  });

  // Form State Client
  const [clientForm, setClientForm] = useState({
    nome_cliente: '',
    email: '',
    telefone: '',
    nivel_prioridade: '3'
  });

  const fetchData = async () => {
    try {
      const [projRes, cliRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/clients')
      ]);
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectForm)
      });
      if (res.ok) {
        setIsProjectModalOpen(false);
        setProjectForm({ titulo_projeto: '', cliente_id: '', categoria: 'Site', due_date_cliente: '', prioridade: 'Normal' });
        fetchData();
      }
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      });
      if (res.ok) {
        setIsClientModalOpen(false);
        setClientForm({ nome_cliente: '', email: '', telefone: '', nivel_prioridade: '3' });
        fetchData();
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Baixa': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'Normal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Alta': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Urgente': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-fade-in max-w-7xl mx-auto min-h-screen">
      
      {/* Botão Voltar */}
      <Link href="/">
        <button className="flex items-center gap-2 text-gray-400 hover:text-teal-400 transition-colors mb-4 group px-3 py-2 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">Voltar ao Dashboard</span>
        </button>
      </Link>

      {/* Header Premium CRM */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-zinc-900/80 to-black/80 p-8 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex gap-5 items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-teal-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-teal-400 tracking-tight">
              CRM & Projetos
            </h1>
            <p className="text-gray-400 mt-1 font-medium text-sm md:text-base">
              Visão consolidada de Clientes e gerenciamento preditivo de Entregas (N8N IA).
            </p>
          </div>
        </div>
        <div className="relative z-10 flex gap-3">
          <button
            onClick={() => setIsClientModalOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-5 rounded-2xl flex items-center gap-2 transition-all border border-white/5 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Novo Cliente
          </button>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-400 text-black font-bold py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] transform hover:-translate-y-0.5"
          >
            <Briefcase className="w-5 h-5" />
            Novo Projeto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            <span className="text-blue-500 font-medium tracking-widest text-sm uppercase">Buscando Base de Dados...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Projetos Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-400" /> Projetos em Esteira
            </h2>
            {projects.length === 0 ? (
               <div className="p-10 border border-white/5 bg-white/[0.02] rounded-3xl text-center">
                 <p className="text-gray-500">Nenhum projeto encontrado. Comece criando um novo projeto.</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map(proj => (
                  <motion.div 
                    key={proj.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-900/60 backdrop-blur-lg border border-white/10 hover:border-blue-500/30 rounded-3xl p-6 relative group transition-all shadow-xl hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.15)] flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${getPriorityColor(proj.prioridade)}`}>
                        {proj.prioridade}
                      </div>
                      <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs text-gray-400 font-medium">
                        {proj.categoria}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{proj.titulo_projeto}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1.5 mb-5">
                      <Users className="w-4 h-4" /> {proj.cliente?.nome_cliente || 'Sem Cliente Vinculado'}
                    </p>

                    <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-2xl flex-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 flex items-center gap-1.5"><Calendar className="w-4 h-4"/> Due Date (Cliente)</span>
                        <span className="text-gray-200 font-medium font-mono">{proj.due_date_cliente ? format(new Date(proj.due_date_cliente), 'dd/MM/yyyy') : 'Sem Prazo'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 flex items-center gap-1.5"><Clock className="w-4 h-4"/> ETA IA (Do Date)</span>
                        <span className="text-teal-400 font-mono font-medium">{proj.eta_previsao_ia ? format(new Date(proj.eta_previsao_ia), 'dd/MM/yyyy') : 'Calculando...'}</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-gray-500 font-medium">
                      <span>Status: <span className="text-white">{proj.status_projeto}</span></span>
                      <span>{formatDistanceToNow(new Date(proj.criado_em), { locale: ptBR })}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      )}

      {/* MODAL PROJETO */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsProjectModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Briefcase className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">Novo Projeto</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Defina escopo, cliente e prazos de entrega definitivos.</p>
                  </div>
                </div>
                <button onClick={() => setIsProjectModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveProject} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 ml-1 uppercase tracking-wider">Título do Projeto</label>
                  <input required type="text" value={projectForm.titulo_projeto} onChange={e => setProjectForm({...projectForm, titulo_projeto: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Ex: Landing Page Tech" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 ml-1 uppercase tracking-wider">Cliente (Dono)</label>
                    <div className="relative">
                      <select required value={projectForm.cliente_id} onChange={e => setProjectForm({...projectForm, cliente_id: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <option value="">Selecione um cliente...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nome_cliente}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 ml-1 uppercase tracking-wider">Categoria / Fluxo</label>
                    <div className="relative">
                      <select value={projectForm.categoria} onChange={e => setProjectForm({...projectForm, categoria: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <option value="Site">Desenvolvimento de Site</option>
                        <option value="Automacao">Fluxo de Automação</option>
                        <option value="Beat">Beat Completo (Música)</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 ml-1 uppercase tracking-wider">Prioridade (Importância)</label>
                     <div className="relative">
                      <select value={projectForm.prioridade} onChange={e => setProjectForm({...projectForm, prioridade: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <option value="Baixa">Baixa</option>
                        <option value="Normal">Normal</option>
                        <option value="Alta">Alta</option>
                        <option value="Urgente">Urgente (Atenção IA)</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 ml-1 uppercase tracking-wider text-red-300">Due Date (Final Client Date)</label>
                    <input type="date" value={projectForm.due_date_cliente} onChange={e => setProjectForm({...projectForm, due_date_cliente: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none border-red-500/30 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all" />
                  </div>
                </div>

                <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex gap-3 text-sm text-teal-200 mt-2">
                  <Server className="w-5 h-5 text-teal-400 shrink-0" />
                  <p>O campo de <b>ETA (Previsão IA - Do Date)</b> será auto-calculado pelos Super Agentes do N8N com base na volumetria de tarefas diárias.</p>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                  <button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-6 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 transition-colors text-white">Cancelar</button>
                  <button type="submit" className="px-8 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-400 text-white hover:from-blue-400 hover:to-indigo-300 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.2)]">Engrenar Projeto</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CLIENTE */}
      <AnimatePresence>
        {isClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsClientModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">Novo Cliente</h2>
                  </div>
                </div>
                <button onClick={() => setIsClientModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveClient} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase">Nome do Cliente / Empresa</label>
                  <input required type="text" value={clientForm.nome_cliente} onChange={e => setClientForm({...clientForm, nome_cliente: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-purple-500" placeholder="Ex: Microsoft" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase">E-mail</label>
                  <input type="email" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-purple-500" placeholder="email@empresa.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase">Whatsapp / Celular (Com DDI)</label>
                  <input type="tel" value={clientForm.telefone} onChange={e => setClientForm({...clientForm, telefone: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-purple-500" placeholder="+551199999999" />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                  <button type="button" onClick={() => setIsClientModalOpen(false)} className="px-6 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 transition-colors text-white">Cancelar</button>
                  <button type="submit" className="px-8 py-3 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-500 transition-colors">Salvar Cliente</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
