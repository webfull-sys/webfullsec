/**
 * ============================================
 * WebfullSec — TimelineView (Gráfico de Timeline)
 * Barras horizontais de projetos por data
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PROJECT_STATUSES } from '@/lib/constants';

/**
 * TimelineView — Visualização em timeline/Gantt dos projetos
 * @param {Object} props
 * @param {Array} props.projects - Lista de projetos
 */
export default function TimelineView({ projects }) {
  const router = useRouter();

  // Calcular range de datas
  const { timelineProjects, startDate, endDate, totalDays } = useMemo(() => {
    const now = new Date();
    const filtered = projects.filter((p) => p.startDate || p.dueDate || p.createdAt);

    // Encontrar data mais antiga e mais recente
    let minDate = new Date(now);
    let maxDate = new Date(now);
    minDate.setMonth(minDate.getMonth() - 1); // 1 mês atrás no mínimo
    maxDate.setMonth(maxDate.getMonth() + 2); // 2 meses à frente

    filtered.forEach((p) => {
      const start = new Date(p.startDate || p.createdAt);
      const end = p.dueDate ? new Date(p.dueDate) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
      if (start < minDate) minDate = new Date(start);
      if (end > maxDate) maxDate = new Date(end);
    });

    const days = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 1;

    return {
      timelineProjects: filtered.map((p) => {
        const start = new Date(p.startDate || p.createdAt);
        const end = p.dueDate ? new Date(p.dueDate) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
        return { ...p, _start: start, _end: end };
      }),
      startDate: minDate,
      endDate: maxDate,
      totalDays: days,
    };
  }, [projects]);

  /**
   * Gera labels dos meses no eixo horizontal
   */
  const monthLabels = useMemo(() => {
    const labels = [];
    const current = new Date(startDate);
    current.setDate(1);

    while (current <= endDate) {
      const offset = Math.max(0, (current - startDate) / (1000 * 60 * 60 * 24));
      const percentage = (offset / totalDays) * 100;
      labels.push({
        label: current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        percentage: Math.min(percentage, 100),
      });
      current.setMonth(current.getMonth() + 1);
    }
    return labels;
  }, [startDate, endDate, totalDays]);

  /**
   * Calcula posição e largura da barra
   */
  const getBarStyle = (project) => {
    const startOffset = Math.max(0, (project._start - startDate) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, (project._end - project._start) / (1000 * 60 * 60 * 24));
    const left = (startOffset / totalDays) * 100;
    const width = Math.max(2, (duration / totalDays) * 100);

    // Cor baseada no status
    const status = PROJECT_STATUSES.find((s) => s.value === project.status);
    return {
      left: `${left}%`,
      width: `${Math.min(width, 100 - left)}%`,
      backgroundColor: status?.color || '#00e5ff',
    };
  };

  // Verificar se é "hoje" e calcular posição
  const todayOffset = (new Date() - startDate) / (1000 * 60 * 60 * 24);
  const todayPercent = (todayOffset / totalDays) * 100;

  return (
    <div className="timeline-view" role="region" aria-label="Timeline de projetos">
      {/* Eixo de meses */}
      <div className="timeline-axis">
        {monthLabels.map((m, i) => (
          <div
            key={i}
            className="timeline-month-label"
            style={{ left: `${m.percentage}%` }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Linhas do grid */}
      <div className="timeline-grid">
        {/* Marker de hoje */}
        {todayPercent >= 0 && todayPercent <= 100 && (
          <div
            className="timeline-today"
            style={{ left: `${todayPercent}%` }}
            title="Hoje"
          >
            <span className="timeline-today-label">Hoje</span>
          </div>
        )}

        {/* Barras de projetos */}
        {timelineProjects.length === 0 && (
          <div className="timeline-empty">
            <span className="text-muted">Nenhum projeto com datas definidas</span>
          </div>
        )}

        {timelineProjects.map((project) => (
          <div key={project.id} className="timeline-row">
            <div
              className="timeline-row-label"
              onClick={() => router.push(`/projects/${project.id}`)}
              role="button"
              tabIndex={0}
            >
              <span>{project.icon || '📁'}</span>
              <span className="timeline-row-title">{project.title}</span>
            </div>
            <div className="timeline-row-track">
              <div
                className="timeline-bar"
                style={getBarStyle(project)}
                onClick={() => router.push(`/projects/${project.id}`)}
                title={`${project.title} — ${project._start.toLocaleDateString('pt-BR')} → ${project._end.toLocaleDateString('pt-BR')}`}
                role="button"
                tabIndex={0}
              >
                <span className="timeline-bar-text">{project.title}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="timeline-legend">
        {PROJECT_STATUSES.map((s) => (
          <div key={s.value} className="timeline-legend-item">
            <span className="timeline-legend-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
