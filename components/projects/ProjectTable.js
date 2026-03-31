/**
 * ============================================
 * WebfullSec — ProjectTable (Visualização em Tabela)
 * Tabela tipo spreadsheet com ordenação por colunas
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PROJECT_STATUSES, PROJECT_CATEGORIES, PRIORITY_LEVELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

/**
 * ProjectTable — Visualização em tabela dos projetos
 * @param {Object} props
 * @param {Array} props.projects - Lista de projetos
 */
export default function ProjectTable({ projects }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');

  /**
   * Alterna ordenação por coluna
   */
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  /**
   * Projetos ordenados
   */
  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      // Tratar datas
      if (sortKey === 'updatedAt' || sortKey === 'createdAt' || sortKey === 'dueDate') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      // Tratar strings
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, sortKey, sortDir]);

  /**
   * Ícone de ordenação
   */
  const SortIcon = ({ column }) => {
    if (sortKey !== column) return <span className="sort-icon">⇅</span>;
    return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="table-wrapper project-table-wrapper" role="table" aria-label="Tabela de projetos">
      <table className="table project-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('title')} className="sortable" style={{ minWidth: 240 }}>
              Projeto <SortIcon column="title" />
            </th>
            <th onClick={() => handleSort('status')} className="sortable">
              Status <SortIcon column="status" />
            </th>
            <th onClick={() => handleSort('category')} className="sortable">
              Categoria <SortIcon column="category" />
            </th>
            <th onClick={() => handleSort('priority')} className="sortable">
              Prioridade <SortIcon column="priority" />
            </th>
            <th>Cliente</th>
            <th onClick={() => handleSort('dueDate')} className="sortable">
              Prazo <SortIcon column="dueDate" />
            </th>
            <th>Progresso</th>
            <th onClick={() => handleSort('updatedAt')} className="sortable">
              Atualizado <SortIcon column="updatedAt" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((project) => {
            const status = PROJECT_STATUSES.find((s) => s.value === project.status);
            const category = PROJECT_CATEGORIES.find((c) => c.value === project.category);
            const priority = PRIORITY_LEVELS.find((p) => p.value === project.priority);
            const totalTasks = project._count?.tasks || 0;
            const completedTasks = project._count?.completedTasks || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const isOverdue = project.dueDate && new Date(project.dueDate) < new Date()
              && project.status !== 'completed' && project.status !== 'archived';

            return (
              <tr
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="clickable"
                role="row"
              >
                <td>
                  <div className="project-table-name">
                    <span className="project-table-icon">{project.icon || '📁'}</span>
                    <span className="project-table-title">{project.title}</span>
                  </div>
                </td>
                <td>
                  <span
                    className={`badge badge-${project.status === 'completed' ? 'success' : project.status === 'in_progress' ? 'accent' : project.status === 'waiting_client' ? 'warning' : 'muted'}`}
                  >
                    {status?.icon} {status?.label}
                  </span>
                </td>
                <td>
                  <span style={{ color: category?.color }}>{category?.label || project.category}</span>
                </td>
                <td>
                  <span style={{ color: priority?.color }}>
                    {priority?.icon} {priority?.label}
                  </span>
                </td>
                <td>
                  <span className="text-muted">{project.client?.name || '—'}</span>
                </td>
                <td>
                  <span className={`font-mono ${isOverdue ? 'text-danger' : ''}`}>
                    {project.dueDate ? formatDate(project.dueDate) : '—'}
                  </span>
                </td>
                <td>
                  {totalTasks > 0 ? (
                    <div className="project-table-progress">
                      <div className="project-table-progress-bar">
                        <div
                          className="project-table-progress-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="project-table-progress-text">{progress}%</span>
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  <span className="font-mono text-muted">
                    {formatDate(project.updatedAt)}
                  </span>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center text-muted" style={{ padding: '40px' }}>
                Nenhum projeto encontrado
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
