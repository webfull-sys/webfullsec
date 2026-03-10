'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus, X, Save, MessageSquare, Briefcase, Zap, Search, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        content: data.reply || data.error || 'Operação processada pelo N8N com sucesso.' 
      };
      
      setChatHistory(prev => [...prev, botMsg]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Erro de comunicação neural.' }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-500 flex items-center gap-3">
            <Bot className="w-8 h-8 text-teal-400" />
            Painel de Super Agentes
          </h1>
          <p className="text-gray-400 mt-2">
            Gerencie sua equipe virtual e conecte fluxos automatizados ao n8n.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-teal-500 hover:bg-teal-600 text-black font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)]"
        >
          <Plus className="w-5 h-5" />
          Novo Agente
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card Add */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => handleOpenModal()}
            className="border-2 border-dashed border-white/10 hover:border-teal-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] transition-colors group"
          >
            <div className="w-14 h-14 bg-white/5 group-hover:bg-teal-500/10 rounded-full flex items-center justify-center mb-4 transition-colors">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-teal-400" />
            </div>
            <h3 className="font-medium text-gray-300 group-hover:text-teal-400">Criar Novo Especialista</h3>
          </motion.div>

          {/* Cards Agents */}
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                 <button onClick={() => openChat(agent)} className="p-2 bg-white/10 hover:bg-teal-500/20 text-teal-400 rounded-lg">
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button onClick={() => handleOpenModal(agent)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg">
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                  agent.isActive ? 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-teal-400' : 'bg-white/5 text-gray-500'
                }`}>
                  {agent.name.toLowerCase().includes('intake') ? <Briefcase className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {agent.name}
                    {!agent.isActive && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full uppercase">Inativo</span>}
                  </h3>
                  <p className="text-xs text-teal-400">{agent.llmModel}</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-6 line-clamp-3 min-h-[60px]">
                {agent.description || agent.systemPrompt.substring(0, 100) + '...'}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  {agent._count?.interactions || 0} interações
                </span>
                <span>Criado há {formatDistanceToNow(new Date(agent.createdAt), { locale: ptBR })}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-zinc-900/90 backdrop-blur-md z-10">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Bot className="w-6 h-6 text-teal-400" />
                  {selectedAgent ? 'Editar Super Agente' : 'Novo Super Agente'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Nome do Agente</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                      placeholder="Ex: Intake Agent"
                      required
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Modelo LLM</label>
                    <select
                      value={formData.llmModel}
                      onChange={e => setFormData({...formData, llmModel: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors appearance-none"
                    >
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Descrição (Opcional)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                    placeholder="Ex: Processa emails de entrada e cria tarefas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    System Prompt (Como o agente deve agir)
                  </label>
                  <textarea
                    value={formData.systemPrompt}
                    onChange={e => setFormData({...formData, systemPrompt: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors min-h-[150px] font-mono text-sm leading-relaxed"
                    placeholder="Você é o especialista X. Suas regras são..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">N8N Webhook URL (Opcional)</label>
                  <input
                    type="url"
                    value={formData.webhookUrl}
                    onChange={e => setFormData({...formData, webhookUrl: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                    placeholder="https://n8n.seu-dominio.com/webhook/xxxx"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Deixe em branco para usar o webhook universal do sistema configurado no .env
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div 
                    className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${formData.isActive ? 'bg-teal-500' : 'bg-gray-700'}`}
                    onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${formData.isActive ? 'left-7' : 'left-1'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-300">Agente Ativo</span>
                </div>

                <div className="flex justify-between pt-6 border-t border-white/10">
                  {selectedAgent ? (
                    <button
                      type="button"
                      onClick={() => deleteAgent(selectedAgent.id)}
                      className="text-red-400 hover:text-red-300 px-4 py-2 font-medium"
                    >
                      Excluir
                    </button>
                  ) : <div></div>}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-2 rounded-xl font-medium bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-xl font-medium bg-teal-500 text-black hover:bg-teal-400 transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Salvar Agente
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Interativo Modal */}
      <AnimatePresence>
        {isChatOpen && selectedAgent && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               onClick={() => setIsChatOpen(false)}
             />
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 50 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 50 }}
               className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[70vh]"
             >
               {/* Header Chat */}
               <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
                     <Bot className="w-5 h-5" />
                   </div>
                   <div>
                     <h3 className="font-bold text-white">{selectedAgent.name}</h3>
                     <p className="text-xs text-teal-400">Online — Via N8N Webhook</p>
                   </div>
                 </div>
                 <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                   <X className="w-5 h-5 text-gray-400" />
                 </button>
               </div>

               {/* Messages */}
               <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-900/50">
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-3">
                      <MessageSquare className="w-10 h-10 opacity-50" />
                      <p>Envie uma instrução ou input<br/>para acordar <b>{selectedAgent.name}</b>.</p>
                    </div>
                  )}

                  {chatHistory.map((msg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user' 
                          ? 'bg-teal-500 text-black rounded-tr-none' 
                          : 'bg-white/10 text-gray-200 rounded-tl-none font-mono text-sm shadow-inner'
                      }`}>
                        {typeof msg.content === 'object' ? <pre className="whitespace-pre-wrap">{JSON.stringify(msg.content, null, 2)}</pre> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isSending && (
                    <div className="flex justify-start">
                       <div className="bg-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center">
                         <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-100" />
                         <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-200" />
                         <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce delay-300" />
                       </div>
                    </div>
                  )}
               </div>

               {/* Input Area */}
               <div className="p-4 border-t border-white/10 bg-black/20">
                 <form 
                  onSubmit={e => { e.preventDefault(); sendChatMessage(); }}
                  className="relative"
                 >
                   <input
                     type="text"
                     value={chatMessage}
                     onChange={e => setChatMessage(e.target.value)}
                     placeholder="Dê uma ordem ou informe contexto bruto..."
                     className="w-full bg-black/50 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-teal-500"
                   />
                   <button 
                    disabled={!chatMessage.trim() || isSending}
                    className="absolute right-2 top-2 p-1.5 bg-teal-500 text-black rounded-lg disabled:opacity-50 hover:bg-teal-400 transition-colors"
                   >
                     <Zap className="w-4 h-4" />
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
