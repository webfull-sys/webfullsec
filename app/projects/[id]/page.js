/**
 * ============================================
 * WebfullSec — Página Individual do Projeto (Notion-like)
 * Capa + ícone + título editável + propriedades + editor de blocos
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/projects/ProjectHeader';
import ProjectProperties from '@/components/projects/ProjectProperties';
import BlockEditor from '@/components/projects/BlockEditor';
import ProjectTimeline from '@/components/projects/ProjectTimeline';

export default function ProjectPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [clients, setClients] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ==========================================
  // Fetch de dados
  // ==========================================

  /** Busca os dados completos do projeto */
  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Projeto não encontrado');
      const data = await res.json();
      // A API retorna { data: project } via apiResponse
      const proj = data.data || data;
      setProject(proj);
      setBlocks(proj.blocks || []);
    } catch (err) {
      console.error('Erro ao buscar projeto:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  /** Busca clientes para o seletor */
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients?active=true');
      if (res.ok) {
        const data = await res.json();
        const clientArray = Array.isArray(data) ? data : (data.clients || data.data?.clients || []);
        // Transformar para usar os mesmos nomes de propriedade para o componente original
        const mappedClients = clientArray.map(c => ({
          ...c,
          id: c.id,
          name: c.nome_cliente || c.name,
        }));
        setClients(mappedClients);
      }
    } catch { /* silencioso */ }
  }, []);

  /** Busca agentes disponíveis */
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || data.data?.agents || data || []);
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    fetchProject();
    fetchClients();
    fetchAgents();
  }, [fetchProject, fetchClients, fetchAgents]);

  // ==========================================
  // Handlers de atualização
  // ==========================================

  /** Atualiza propriedades do projeto */
  const handleUpdateProject = useCallback(async (updates) => {
    // Otimista
    setProject((prev) => ({ ...prev, ...updates }));

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.data || data;
        setProject((prev) => ({ ...prev, ...updated }));
      }
    } catch (err) {
      console.error('Erro ao atualizar projeto:', err);
    }
  }, [id]);

  /** Vincula agente ao projeto */
  const handleLinkAgent = useCallback(async (agentId) => {
    try {
      const res = await fetch(`/api/projects/${id}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      if (res.ok) {
        // Recarregar projeto para atualizar lista de agentes
        fetchProject();
      }
    } catch (err) {
      console.error('Erro ao vincular agente:', err);
    }
  }, [id, fetchProject]);

  /** Desvincula agente do projeto */
  const handleUnlinkAgent = useCallback(async (agentId) => {
    try {
      await fetch(`/api/projects/${id}/agents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      // Remover do estado local
      setProject((prev) => ({
        ...prev,
        projectAgents: (prev.projectAgents || []).filter(
          (pa) => pa.agentId !== agentId && pa.agent?.id !== agentId
        ),
      }));
    } catch (err) {
      console.error('Erro ao desvincular agente:', err);
    }
  }, [id]);

  /** Deleta o projeto */
  const handleDelete = useCallback(async () => {
    if (!confirm('Tem certeza que deseja excluir este projeto e todo seu conteúdo?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      router.push('/projects');
    } catch (err) {
      console.error('Erro ao excluir projeto:', err);
    }
  }, [id, router]);

  // ==========================================
  // Render
  // ==========================================

  if (loading) {
    return (
      <AppShell pageTitle="Carregando...">
        <div className="empty-state"><div className="spinner" /></div>
      </AppShell>
    );
  }

  if (error || !project) {
    return (
      <AppShell pageTitle="Erro">
        <div className="empty-state">
          <div className="empty-state-icon">😕</div>
          <p className="empty-state-title">{error || 'Projeto não encontrado'}</p>
          <button className="btn btn-primary" onClick={() => router.push('/projects')}>
            ← Voltar aos Projetos
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle={project.title}>
      <div className="notion-page">
        {/* Breadcrumb */}
        <nav className="notion-breadcrumb" aria-label="Navegação">
          <a href="/projects" className="notion-breadcrumb-link">📁 Projetos</a>
          <span className="notion-breadcrumb-sep">/</span>
          <span className="notion-breadcrumb-current">
            {project.icon || '📁'} {project.title}
          </span>
        </nav>

        {/* Header (Capa + Ícone + Título) */}
        <ProjectHeader project={project} onUpdate={handleUpdateProject} />

        {/* Propriedades */}
        <ProjectProperties
          project={project}
          clients={clients}
          agents={agents}
          onUpdate={handleUpdateProject}
          onLinkAgent={handleLinkAgent}
          onUnlinkAgent={handleUnlinkAgent}
        />

        {/* Divisor visual */}
        <hr className="notion-divider" />

        {/* Comando do PM Agent (Integração N8N) */}
        {project.projectAgents?.length > 0 && (
          <div className="agent-command-bar" style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem' }}>🤖</span>
            <input 
              type="text" 
              placeholder="Dar ordem ao(s) Agente(s) do projeto... (ex: Sintetize as anotações e crie as tarefas)"
              className="notion-input"
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)' }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const val = e.target.value.trim();
                  if (!val) return;
                  e.target.disabled = true;
                  const originalPlaceholder = e.target.placeholder;
                  e.target.placeholder = 'Orquestrando com a Equipe...';
                  e.target.value = '';
                  
                  try {
                    await fetch('/api/ai/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ message: val, currentPath: window.location.pathname })
                    });
                    e.target.placeholder = 'Comando delegado! Atualize painel em breve.';
                    setTimeout(() => { e.target.placeholder = originalPlaceholder }, 3000);
                  } catch (err) {
                    console.error(err);
                    e.target.placeholder = 'Erro de conexão com o Orchestrator.';
                  } finally {
                    e.target.disabled = false;
                  }
                }
              }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>↵ Enter</span>
          </div>
        )}

        {/* Resumo & Cronologia IA */}
        <ProjectTimeline project={project} onUpdate={handleUpdateProject} />

        {/* Editor de Blocos */}
        <BlockEditor
          blocks={blocks}
          projectId={id}
          onBlocksChange={setBlocks}
        />

        {/* Sidebar lateral: Tarefas */}
        {project.tasks?.length > 0 && (
          <div className="notion-sidebar-section">
            {/* Tarefas vinculadas */}
            {project.tasks?.length > 0 && (
              <div className="notion-mini-section">
                <h3 className="notion-mini-title">📋 Tarefas ({project.tasks.length})</h3>
                <div className="notion-mini-list">
                  {project.tasks.slice(0, 10).map((task) => (
                    <div key={task.id} className="notion-mini-item">
                      <span className={`notion-mini-status ${task.status}`}>
                        {task.status === 'done' ? '✓' : task.status === 'in_progress' ? '▶' : '○'}
                      </span>
                      <span className={task.status === 'done' ? 'text-through' : ''}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer com ações */}
        <div className="notion-page-footer">
          <button className="btn btn-ghost btn-sm" onClick={handleDelete}>
            🗑️ Excluir Projeto
          </button>
          <span className="text-muted" style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
            Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
    </AppShell>
  );
}
