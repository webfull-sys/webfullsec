/**
 * ============================================
 * WebfullSec — KanbanBoard (Visualização Kanban)
 * Colunas por status com cards arrastáveis
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PROJECT_STATUSES, PRIORITY_LEVELS } from '@/lib/constants';

/**
 * KanbanBoard — Visualização Kanban de projetos
 * @param {Object} props
 * @param {Array} props.projects - Lista de projetos
 * @param {Function} props.onUpdateStatus - Callback para atualizar status (projectId, newStatus)
 */
export default function KanbanBoard({ projects, onUpdateStatus }) {
  const router = useRouter();
  const [draggedProject, setDraggedProject] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Agrupar projetos por status
  const columns = PROJECT_STATUSES.map((status) => ({
    ...status,
    projects: projects.filter((p) => p.status === status.value),
  }));

  // ==========================================
  // Drag & Drop
  // ==========================================

  const handleDragStart = (e, project) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, statusValue) => {
    e.preventDefault();
    setDragOverColumn(statusValue);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, statusValue) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedProject && draggedProject.status !== statusValue) {
      await onUpdateStatus(draggedProject.id, statusValue);
    }
    setDraggedProject(null);
  };

  // Retorna a cor da prioridade
  const getPriorityInfo = (priority) => {
    return PRIORITY_LEVELS.find((p) => p.value === priority) || PRIORITY_LEVELS[1];
  };

  return (
    <div className="kanban-board" role="region" aria-label="Quadro Kanban de projetos">
      {columns.map((column) => (
        <div
          key={column.value}
          className={`kanban-column ${dragOverColumn === column.value ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, column.value)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.value)}
        >
          {/* Cabeçalho da coluna */}
          <div className="kanban-column-header">
            <div className="kanban-column-title">
              <span className="kanban-column-icon">{column.icon}</span>
              <span>{column.label}</span>
              <span className="kanban-column-count">{column.projects.length}</span>
            </div>
          </div>

          {/* Cards */}
          <div className="kanban-column-body">
            {column.projects.map((project) => {
              const priority = getPriorityInfo(project.priority);
              const totalTasks = project._count?.tasks || 0;
              const completedTasks = project._count?.completedTasks || 0;
              const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

              return (
                <div
                  key={project.id}
                  className={`kanban-card ${draggedProject?.id === project.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, project)}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Projeto: ${project.title}`}
                >
                  {/* Indicador de prioridade */}
                  <div
                    className="kanban-card-priority"
                    style={{ background: priority.color }}
                    title={`Prioridade: ${priority.label}`}
                  />

                  <div className="kanban-card-content">
                    <div className="kanban-card-header">
                      <span className="kanban-card-icon">{project.icon || '📁'}</span>
                      <h4 className="kanban-card-title">{project.title}</h4>
                    </div>

                    {project.description && (
                      <p className="kanban-card-desc">
                        {project.description.slice(0, 80)}{project.description.length > 80 ? '...' : ''}
                      </p>
                    )}

                    <div className="kanban-card-footer">
                      {/* Cliente */}
                      {project.client && (
                        <span className="kanban-card-client">
                          👤 {project.client.name}
                        </span>
                      )}

                      {/* Tarefas */}
                      {totalTasks > 0 && (
                        <span className="kanban-card-tasks">
                          ☑ {completedTasks}/{totalTasks}
                        </span>
                      )}

                      {/* Agentes */}
                      {project.projectAgents?.length > 0 && (
                        <span className="kanban-card-agents">
                          🤖 {project.projectAgents.length}
                        </span>
                      )}
                    </div>

                    {/* Barra de progresso */}
                    {totalTasks > 0 && (
                      <div className="kanban-card-progress">
                        <div
                          className="kanban-card-progress-bar"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Área vazia */}
            {column.projects.length === 0 && (
              <div className="kanban-empty">
                <span className="text-muted">Nenhum projeto</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
