'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus, X, Save, MessageSquare, Briefcase, Zap, Settings, ArrowLeft, Sparkles, Server } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

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
    } catch (error) {
      console.error('Erro ao buscar agentes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleOpenModal = (agent = null) => {
    if (agent) {
      setFormData(agent);
    } else {
      setFormData({
        name: '',
        description: '',
        systemPrompt: '',
        llmModel: 'gemini-2.0-flash',
        webhookUrl: '',
        isActive: true
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
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchAgents();
      }
    } catch (error) {
      console.error('Erro ao salvar agente:', error);
    }
  };

  const deleteAgent = async (id) => {
    if (!confirm('Excluir este agente definitivamente?')) return;
    try {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAgents();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const openChat = (agent) => {
    setSelectedAgent(agent);
    setChatHistory([]); // Limpa ou busca histórico futuro
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
    } finally {
      setIsSending(false);
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

      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-zinc-900/80 to-black/80 p-8 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex gap-5 items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.2)]">
            <Sparkles className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-teal-100 to-teal-400 tracking-tight">
              Super Agentes
            </h1>
            <p className="text-gray-400 mt-1 font-medium text-sm md:text-base">
              Orquestre sua equipe virtual conectada ao N8N e PostgreSQL (Pgvector).
            </p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="relative z-10 bg-teal-500 hover:bg-teal-400 text-black font-bold py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-[0_0_30px_rgba(20,184,166,0.3)] hover:shadow-[0_0_40px_rgba(20,184,166,0.5)] transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Novo Especialista
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin shadow-[0_0_15px_rgba(20,184,166,0.5)]" />
            <span className="text-teal-500 font-medium tracking-widest text-sm uppercase">Carregando Redes Neurais</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Card Add */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => handleOpenModal()}
            className="border-2 border-dashed border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 hover:border-teal-500/60 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px] transition-all group backdrop-blur-sm"
          >
            <div className="w-16 h-16 bg-teal-500/10 group-hover:bg-teal-500/20 rounded-full flex items-center justify-center mb-4 transition-colors">
              <Plus className="w-8 h-8 text-teal-400" />
            </div>
            <h3 className="font-bold tracking-wide text-gray-300 group-hover:text-teal-300">Injetar Novo Agente</h3>
            <p className="text-xs text-gray-500 mt-2 font-mono">Conecte IA a workflows n8n</p>
          </motion.div>

          {/* Cards Agents */}
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/60 backdrop-blur-lg border border-white/10 hover:border-teal-500/30 rounded-3xl p-6 relative group transition-all shadow-xl hover:shadow-[0_10px_40px_-10px_rgba(20,184,166,0.15)] flex flex-col"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                 <button onClick={() => openChat(agent)} className="p-2.5 bg-zinc-800 hover:bg-teal-500 text-teal-400 hover:text-black rounded-xl transition-colors shadow-lg">
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button onClick={() => handleOpenModal(agent)} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-gray-400 hover:text-white rounded-xl transition-colors shadow-lg">
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border ${
                  agent.isActive ? 'bg-gradient-to-br from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-400' : 'bg-black/30 border-white/5 text-gray-600'
                }`}>
                  {agent.name.toLowerCase().includes('intake') ? <Briefcase className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
                    {agent.name}
                    {!agent.isActive && <span className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Off</span>}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Server className="w-3 h-3 text-emerald-400" />
                    <p className="text-xs text-emerald-400 font-mono tracking-tight">{agent.llmModel}</p>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 mb-6 flex-1">
                <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">
                  {agent.description || agent.systemPrompt.substring(0, 100) + '...'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs font-medium text-gray-500">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  {agent._count?.interactions || 0} Ações Executadas
                </span>
                <span className="opacity-70">{formatDistanceToNow(new Date(agent.createdAt), { locale: ptBR })}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* MODAL EDITOR Premium */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                    <Bot className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">
                      {selectedAgent ? 'Configuração do Agente' : 'Programação Neural (Novo Agente)'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">Defina as diretrizes e a API do webhook alvo.</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-300 mb-3 ml-1 uppercase tracking-wider">Identidade</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-inner"
                      placeholder="Ex: Intake Agent (Triagem)"
                      required
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-300 mb-3 ml-1 uppercase tracking-wider">Plataforma LLM</label>
                    <div className="relative">
                      <select
                        value={formData.llmModel}
                        onChange={e => setFormData({...formData, llmModel: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all appearance-none shadow-inner"
                      >
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Padrão/N8N)</option>
                        <option value="gpt-4o">OpenAI GPT-4o (N8N Vision)</option>
                        <option value="claude-3-opus">Anthropic Claude 3.5 Sonnet</option>
                      </select>
                      <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-gray-500">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 ml-1 uppercase tracking-wider">Descrição das Habilidades</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-inner"
                    placeholder="Ex: Ouve audios via webhook e cria projetos na aba CRM"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 ml-1">
                    <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Regras e Treinamento (System Prompt)
                    </label>
                    <span className="text-xs text-teal-400 bg-teal-500/10 px-2 py-1 rounded-md font-mono">system.role</span>
                  </div>
                  <textarea
                    value={formData.systemPrompt}
                    onChange={e => setFormData({...formData, systemPrompt: e.target.value})}
                    className="w-full bg-[#0a0a0a] border border-white/10 hover:border-white/20 rounded-2xl px-5 py-5 text-teal-50 font-mono text-sm leading-relaxed focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all min-h-[200px] shadow-inner resize-y"
                    placeholder="Instrua o modelo de IA sobre as tabelas e comportamentos esperados..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 ml-1 uppercase tracking-wider">N8N Webhook URL de Escuta</label>
                  <div className="relative">
                    <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="url"
                      value={formData.webhookUrl}
                      onChange={e => setFormData({...formData, webhookUrl: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white font-mono text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-inner"
                      placeholder="https://n8n.../webhook/xxxx"
                    />
                  </div>
                  <p className="text-xs text-gray-500 font-medium ml-1 mt-2">
                    Deixe em branco para forçar o uso universal do .env (Recomendado)
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div 
                    className={`w-14 h-7 rounded-full cursor-pointer transition-colors relative flex-shrink-0 ${formData.isActive ? 'bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.4)]' : 'bg-gray-800'}`}
                    onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-md ${formData.isActive ? 'left-8' : 'left-1'}`} />
                  </div>
                  <div>
                    <span className="text-base font-bold text-white block">Status Operacional</span>
                    <span className="text-xs text-gray-400">Desative para pausar chamadas a este agente via UI</span>
                  </div>
                </div>

                <div className="flex justify-between pt-8 border-t border-white/10">
                  {selectedAgent ? (
                    <button
                      type="button"
                      onClick={() => deleteAgent(selectedAgent.id)}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10 px-5 py-3 rounded-xl font-bold transition-colors"
                    >
                      Desativar Permanente (Excluir)
                    </button>
                  ) : <div />}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 transition-colors text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 rounded-xl font-bold bg-gradient-to-r from-teal-500 to-emerald-400 text-black hover:from-teal-400 hover:to-emerald-300 transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.2)] transform hover:-translate-y-0.5"
                    >
                      <Save className="w-5 h-5" />
                      Guardar Protocolo
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHAT INTERATIVO N8N */}
      <AnimatePresence>
        {isChatOpen && selectedAgent && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/80 backdrop-blur-xl"
               onClick={() => setIsChatOpen(false)}
             />
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 50 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 50 }}
               className="relative bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] lg:h-[75vh]"
             >
               {/* Header Chat */}
               <div className="p-5 border-b border-white/10 bg-zinc-900/80 backdrop-blur-xl flex items-center justify-between z-10">
                 <div className="flex items-center gap-4">
                   <div className="relative">
                     <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                       <Bot className="w-6 h-6" />
                     </div>
                     <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-950 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                   </div>
                   <div>
                     <h3 className="font-black text-xl text-white tracking-tight">{selectedAgent.name}</h3>
                     <p className="text-xs font-mono text-teal-400 flex items-center gap-1.5 mt-0.5">
                       <Zap className="w-3 h-3" /> Comunicação Segura via N8N
                     </p>
                   </div>
                 </div>
                 <button onClick={() => setIsChatOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                   <X className="w-5 h-5" />
                 </button>
               </div>

               {/* Messages Window */}
               <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black relative">
                  {chatHistory.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10">
                      <div className="w-24 h-24 mb-6 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center">
                        <MessageSquare className="w-10 h-10 text-gray-500" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-300 mb-2">Inicie a transmissão para {selectedAgent.name}</h4>
                      <p className="text-gray-500 text-sm max-w-sm">
                        Envie uma instrução textual, JSON bruto ou descrição de cenário. O n8n processará estes dados conforme a sua programação.
                      </p>
                    </div>
                  )}

                  {chatHistory.map((msg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-[24px] px-6 py-4 shadow-xl ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-br from-teal-500 to-emerald-400 text-black rounded-tr-sm' 
                          : 'bg-[#111] border border-white/5 text-gray-200 rounded-tl-sm font-mono text-sm leading-relaxed'
                      }`}>
                        {typeof msg.content === 'object' ? <pre className="whitespace-pre-wrap">{JSON.stringify(msg.content, null, 2)}</pre> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isSending && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                       <div className="bg-[#111] border border-white/5 rounded-[24px] rounded-tl-sm px-5 py-4 flex gap-2 items-center">
                         <div className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
                         <div className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse delay-150 shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
                         <div className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse delay-300 shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
                       </div>
                    </motion.div>
                  )}
               </div>

               {/* Input Terminal */}
               <div className="p-5 border-t border-white/10 bg-zinc-950">
                 <form 
                  onSubmit={e => { e.preventDefault(); sendChatMessage(); }}
                  className="relative flex items-center"
                 >
                   <input
                     type="text"
                     value={chatMessage}
                     onChange={e => setChatMessage(e.target.value)}
                     placeholder="Dispare um evento neural..."
                     className="w-full bg-[#111] border border-white/10 focus:border-teal-500/50 rounded-2xl pl-6 pr-16 py-5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/50 transition-all font-medium"
                   />
                   <button 
                    disabled={!chatMessage.trim() || isSending}
                    className="absolute right-3 p-3 bg-teal-500 text-black rounded-xl disabled:opacity-30 disabled:bg-gray-600 hover:bg-teal-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                   >
                     <Zap className="w-5 h-5 fill-black" />
                   </button>
                 </form>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
