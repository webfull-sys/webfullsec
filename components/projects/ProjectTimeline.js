'use client';

import { useState } from 'react';

/**
 * ProjectTimeline — Exibe o resumo geral e a linha do tempo de memórias
 * para acompanhamento de atividades do projeto via IA.
 */
export default function ProjectTimeline({ project, onUpdate }) {
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [localContext, setLocalContext] = useState(project?.generalContext || '');

  const handleSaveContext = () => {
    onUpdate({ generalContext: localContext });
    setIsEditingContext(false);
  };

  return (
    <div className="notion-timeline-section" style={{ marginTop: '2rem', marginBottom: '2rem', background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
          🤖 Resumo do Agente IA & Cronologia
        </h2>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Contexto Atual / Onde paramos
        </h3>
        
        {isEditingContext ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              className="form-textarea"
              value={localContext}
              onChange={(e) => setLocalContext(e.target.value)}
              placeholder="Descreva o escopo, onde parou e próximos passos que o Agente precisa saber..."
              rows={4}
              style={{ background: 'var(--background)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setIsEditingContext(false); setLocalContext(project.generalContext || ''); }}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveContext}>Salvar Contexto</button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setIsEditingContext(true)}
            style={{ 
              padding: '1rem', 
              background: 'var(--background)', 
              borderRadius: '8px', 
              color: project.generalContext ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'text',
              border: '1px solid var(--border)',
              minHeight: '60px',
              whiteSpace: 'pre-wrap'
            }}
          >
            {project.generalContext || 'Clique para adicionar o escopo e o status atual para os Agentes IA...'}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Cronologia de Acontecimentos
        </h3>
        {(!project.memories || project.memories.length === 0) ? (
          <div className="text-muted" style={{ padding: '1rem', background: 'var(--background)', borderRadius: '8px', textAlign: 'center' }}>
            Nenhum registro de atividade ainda. A IA atualizará esta linha do tempo automaticamente conforme o projeto avança.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '2px solid var(--border)', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
            {project.memories.map(mem => (
              <div key={mem.id} style={{ position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '-1.45rem', 
                  top: '0', 
                  background: 'var(--surface)', 
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  border: '2px solid var(--primary)'
                }}>
                  {mem.type === 'milestone' ? '🏆' : mem.type === 'decision' ? '⚖️' : mem.type === 'blocker' ? '🚧' : mem.type === 'ai_summary' ? '🤖' : '📝'}
                </div>
                <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{mem?.type?.toUpperCase()}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {mem?.createdAt ? new Date(mem.createdAt).toLocaleString('pt-BR') : '—'}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>{mem?.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
