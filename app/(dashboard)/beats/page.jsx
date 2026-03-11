'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Play, Disc, Filter, Activity, Server, UploadCloud, Edit3, X, Save } from 'lucide-react';
import { format } from 'date-fns';
import AppShell from '@/components/layout/AppShell';

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
    } catch (error) { console.error('Erro ao buscar beats:', error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBeats(); }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Ideia/Rascunho': return 'var(--text-secondary)';
      case 'Arranjo': return '#9333ea'; // purple
      case 'Mixagem': return 'var(--primary)';
      case 'Masterização': return '#ec4899'; // pink
      case 'Aguardando Aprovação': return '#f59e0b'; // orange
      case 'Finalizado': return 'var(--success)';
      default: return 'var(--text-secondary)';
    }
  };

  const handleUpdateBeat = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/beats', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingBeat)
      });
      if (res.ok) {
        setEditingBeat(null);
        fetchBeats();
      }
    } catch (err) { console.error(err); }
  };

  const filteredBeats = beats.filter(b => {
    if (statusFilter && b.status_producao !== statusFilter) return false;
    if (bpmFilter && b.bpm && b.bpm !== parseInt(bpmFilter)) return false;
    return true;
  });

  return (
    <AppShell pageTitle="Studio Beats">

      {/* Header Padronizado */}
      <div className="page-header">
        <div>
          <h2 className="page-title">🎧 Studio & Beats</h2>
          <p className="page-subtitle">Pipeline de produção musical. Dispara o Evolution API (WhatsApp) ao finalizar.</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 'var(--space-md)' }}>
           <select 
             className="form-select" 
             value={statusFilter} 
             onChange={e => setStatusFilter(e.target.value)}
             style={{ width: '180px' }}
           >
              <option value="">Todos os Status</option>
              <option value="Ideia/Rascunho">Ideia/Rascunho</option>
              <option value="Arranjo">Arranjo</option>
              <option value="Mixagem">Mixagem</option>
              <option value="Masterização">Masterização</option>
              <option value="Finalizado">Finalizado</option>
           </select>
           <input 
             type="number" 
             className="form-input" 
             placeholder="BPM..." 
             value={bpmFilter} 
             onChange={e => setBpmFilter(e.target.value)} 
             style={{ width: '120px' }}
           />
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {filteredBeats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💿</div>
              <p className="empty-state-title">Nenhum beat encontrado</p>
            </div>
          ) : (
            filteredBeats.map(beat => (
              <div 
                key={beat.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1 }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', background: 'var(--background)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--border)'
                  }}>
                     <Disc size={20} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {beat.titulo_faixa}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Cliente: <strong>{beat.projeto?.cliente?.nome_cliente || 'N/A'}</strong></p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)', flex: 1 }}>
                  <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Activity size={12}/> {beat.bpm || '--'} BPM
                  </span>
                  <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Music size={12}/> {beat.tom_escala || '--'}
                  </span>
                  <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    {beat.genero || 'Gênero NDA'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '16px', border: '1px solid currentColor', color: getStatusColor(beat.status_producao) }}>
                    {beat.status_producao}
                  </span>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setEditingBeat(beat)}
                    style={{ padding: '8px' }}
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Editar Beat */}
      {editingBeat && (
        <div className="modal-backdrop" onClick={() => setEditingBeat(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Editar Produção: {editingBeat.titulo_faixa}</h3>
              <button className="modal-close" onClick={() => setEditingBeat(null)}>×</button>
            </div>
            <form onSubmit={handleUpdateBeat}>
              <div className="modal-body">
                <div className="form-row">
                   <div className="form-group">
                    <label className="form-label">Status de Produção</label>
                    <select className="form-select" value={editingBeat.status_producao} onChange={e => setEditingBeat({...editingBeat, status_producao: e.target.value})}>
                      <option value="Ideia/Rascunho">Ideia/Rascunho</option>
                      <option value="Arranjo">Arranjo</option>
                      <option value="Mixagem">Mixagem</option>
                      <option value="Masterização">Masterização</option>
                      <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                      <option value="Finalizado">Finalizado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gênero</label>
                    <input className="form-input" type="text" value={editingBeat.genero || ''} onChange={e => setEditingBeat({...editingBeat, genero: e.target.value})} placeholder="Ex: Trap" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">BPM</label>
                    <input className="form-input" type="number" value={editingBeat.bpm || ''} onChange={e => setEditingBeat({...editingBeat, bpm: parseInt(e.target.value) || ''})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tom / Escala</label>
                    <input className="form-input" type="text" value={editingBeat.tom_escala || ''} onChange={e => setEditingBeat({...editingBeat, tom_escala: e.target.value})} placeholder="Ex: C Minor" />
                  </div>
                </div>
                
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                  💿 Entregáveis Digitais
                </h4>
                <div style={{ background: 'var(--background)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div className="form-group">
                    <label className="form-label">Link MP3 (Preview)</label>
                    <input type="url" className="form-input" value={editingBeat.link_preview_mp3 || ''} onChange={e => setEditingBeat({...editingBeat, link_preview_mp3: e.target.value})} placeholder="URL do arquivo MP3" />
                  </div>
                  <div className="form-group" style={{ marginTop: 'var(--space-sm)' }}>
                    <label className="form-label">Link Stems / WAV Trackouts (Google Drive)</label>
                    <input type="url" className="form-input" value={editingBeat.link_stems_wav || ''} onChange={e => setEditingBeat({...editingBeat, link_stems_wav: e.target.value})} placeholder="https://drive.google.com/..." />
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 'var(--space-lg)', padding: 'var(--space-sm)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  Mudar o status para <strong>Finalizado</strong> ativará automaticamente o Agente de Entrega via N8N.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingBeat(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={16} /> Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AppShell>
  );
}
