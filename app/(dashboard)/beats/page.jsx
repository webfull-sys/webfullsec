'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Play, Disc, ArrowLeft, Filter, Activity, Server, UploadCloud, Edit3, X, Save } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function BeatsPage() {
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bpmFilter, setBpmFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [editingBeat, setEditingBeat] = useState(null);

  const fetchBeats = async () => {
    try {
      const res = await fetch('/api/beats');
      const data = await res.json();
      setBeats(data);
    } catch (error) {
      console.error('Erro ao buscar beats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeats();
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Ideia/Rascunho': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'Arranjo': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Mixagem': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Masterização': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'Aguardando Aprovação': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Finalizado': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleUpdateBeat = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/beats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBeat)
      });
      if (res.ok) {
        setEditingBeat(null);
        fetchBeats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredBeats = beats.filter(b => {
    if (statusFilter && b.status_producao !== statusFilter) return false;
    if (bpmFilter && b.bpm && b.bpm !== parseInt(bpmFilter)) return false;
    return true;
  });

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-fade-in max-w-7xl mx-auto min-h-screen">
      
      <Link href="/">
        <button className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors mb-4 group px-3 py-2 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">Voltar ao Dashboard</span>
        </button>
      </Link>

      {/* Header Premium Music */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-zinc-900/80 to-black/80 p-8 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-pink-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex gap-5 items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            <Music className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-pink-400 tracking-tight">
              Studio & Beats
            </h1>
            <p className="text-gray-400 mt-1 font-medium text-sm md:text-base">
              Pipeline de produção musical. Dispara o Evolution API (WhatsApp) ao finalizar.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-40">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
             <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white appearance-none focus:outline-none focus:border-purple-500 text-sm">
                <option value="">Status...</option>
                <option value="Ideia/Rascunho">Ideia/Rascunho</option>
                <option value="Arranjo">Arranjo</option>
                <option value="Mixagem">Mixagem</option>
                <option value="Masterização">Masterização</option>
                <option value="Finalizado">Finalizado</option>
             </select>
          </div>
          <div className="relative flex-1 md:w-32">
             <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
             <input type="number" placeholder="BPM" value={bpmFilter} onChange={e => setBpmFilter(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
            <span className="text-purple-500 font-medium tracking-widest text-sm uppercase">Carregando Tracks...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBeats.length === 0 ? (
            <div className="p-10 border border-white/5 bg-white/[0.02] rounded-3xl text-center">
              <p className="text-gray-500">Nenhum beat encontrado com este filtro.</p>
            </div>
          ) : (
            filteredBeats.map(beat => (
              <motion.div 
                key={beat.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900/60 backdrop-blur-lg border border-white/10 hover:border-purple-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all shadow-xl hover:shadow-[0_10px_40px_-10px_rgba(168,85,247,0.15)] group"
              >
                <div className="flex items-center gap-5 flex-1 w-full md:w-auto">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:animate-pulse">
                     <Disc className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1 tracking-tight flex items-center gap-2">
                      {beat.titulo_faixa}
                    </h3>
                    <p className="text-sm text-gray-400">Cliente: <span className="text-gray-200">{beat.projeto?.cliente?.nome_cliente || 'N/A'}</span></p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 flex-1">
                  <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-gray-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-purple-400"/> {beat.bpm || '--'} BPM
                  </div>
                  <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-gray-300 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-pink-400"/> {beat.tom_escala || '--'}
                  </div>
                   <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300">
                    {beat.genero || 'Gênero NDA'}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                  <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border ${getStatusColor(beat.status_producao)}`}>
                    {beat.status_producao}
                  </div>
                  <button onClick={() => setEditingBeat(beat)} className="p-3 bg-white/5 hover:bg-purple-500 hover:text-white text-purple-400 rounded-xl transition-colors shadow-lg">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* MODAL EDITAR BEAT */}
      <AnimatePresence>
        {editingBeat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setEditingBeat(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <Disc className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{editingBeat.titulo_faixa}</h2>
                    <p className="text-sm text-gray-500">Editando metadados e status da produção.</p>
                  </div>
                </div>
                <button onClick={() => setEditingBeat(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleUpdateBeat} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase">Status de Produção</label>
                    <div className="relative">
                      <select value={editingBeat.status_producao} onChange={e => setEditingBeat({...editingBeat, status_producao: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white appearance-none focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500">
                        <option value="Ideia/Rascunho">Ideia/Rascunho</option>
                        <option value="Arranjo">Arranjo</option>
                        <option value="Mixagem">Mixagem</option>
                        <option value="Masterização">Masterização</option>
                        <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                        <option value="Finalizado">Finalizado</option>
                      </select>
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase">Gênero</label>
                    <input type="text" value={editingBeat.genero || ''} onChange={e => setEditingBeat({...editingBeat, genero: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-purple-500" placeholder="Ex: Trap" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase">BPM</label>
                    <input type="number" value={editingBeat.bpm || ''} onChange={e => setEditingBeat({...editingBeat, bpm: parseInt(e.target.value) || ''})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase">Tom / Escala</label>
                    <input type="text" value={editingBeat.tom_escala || ''} onChange={e => setEditingBeat({...editingBeat, tom_escala: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-purple-500" placeholder="Ex: C Minor" />
                  </div>
                </div>
                
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                  <h4 className="font-bold text-gray-200 flex items-center gap-2"><UploadCloud className="w-4 h-4"/> Entregáveis Digitais</h4>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Link MP3 (Preview)</label>
                    <input type="url" value={editingBeat.link_preview_mp3 || ''} onChange={e => setEditingBeat({...editingBeat, link_preview_mp3: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm" placeholder="URL do arquivo MP3" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Link Stems / WAV Trackouts (Google Drive)</label>
                    <input type="url" value={editingBeat.link_stems_wav || ''} onChange={e => setEditingBeat({...editingBeat, link_stems_wav: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm" placeholder="https://drive.google.com/..." />
                  </div>
                </div>

                 <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex gap-3 text-sm text-teal-200 mt-2">
                  <Server className="w-5 h-5 text-teal-400 shrink-0" />
                  <p>Mudar o status para <b>Finalizado</b> ativará automaticamente o Agente de Entrega via N8N.</p>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                  <button type="button" onClick={() => setEditingBeat(null)} className="px-6 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-colors">Cancelar</button>
                  <button type="submit" className="px-8 py-3 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-500 transition-colors flex items-center gap-2">
                    <Save className="w-4 h-4" /> Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
