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
        setClients(data.clients || data.data?.clients || []);
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

        {/* Editor de Blocos */}
        <BlockEditor
          blocks={blocks}
          projectId={id}
          onBlocksChange={setBlocks}
        />

        {/* Sidebar lateral: Tarefas + Memórias */}
        {(project.tasks?.length > 0 || project.memories?.length > 0) && (
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

            {/* Últimas memórias */}
            {project.memories?.length > 0 && (
              <div className="notion-mini-section">
                <h3 className="notion-mini-title">💭 Atividade Recente</h3>
                <div className="notion-mini-list">
                  {project.memories.slice(0, 5).map((mem) => (
                    <div key={mem.id} className="notion-mini-item notion-memory">
                      <span className="notion-memory-type">
                        {mem.type === 'milestone' ? '🏆' : mem.type === 'blocker' ? '🚧' : '📝'}
                      </span>
                      <div>
                        <span className="notion-memory-content">{mem.content}</span>
                        <span className="notion-memory-date">{new Date(mem.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
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
