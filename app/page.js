'use client';

/**
 * ============================================
 * WebfullSec — Dashboard Principal
 * Tela inicial: métricas, plano do dia, tarefas
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 */

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import PomodoroTimer from '@/components/pomodoro/PomodoroTimer';
import { getGreeting, formatDate, formatMinutes, getStatusLabel, getPriorityColor } from '@/lib/utils';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedToday: 0,
    inProgress: 0,
    overdue: 0,
    totalProjects: 0,
    activeClients: 0,
    todayHours: 0,
    inboxUnread: 0,
  });
  const [todayTasks, setTodayTasks] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStartDay, setShowStartDay] = useState(false);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  // Carregar dados do dashboard
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsRes, tasksRes, projectsRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/tasks?doDate=today&limit=10'),
          fetch('/api/projects?limit=5&status=in_progress'),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setTodayTasks(data.tasks || []);
        }
        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setRecentProjects(data.projects || []);
        }
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      }
      setLoading(false);
    };

    fetchDashboard();

    // Verificar se deve mostrar "Start your Day"
    const today = new Date().toDateString();
    const lastStart = localStorage.getItem('webfullsec_last_start');
    if (lastStart !== today) {
      setShowStartDay(true);
    }
  }, []);

  // Marcar tarefa como concluída
  const toggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          completedAt: newStatus === 'done' ? new Date().toISOString() : null,
        }),
      });
      if (res.ok) {
        setTodayTasks(prev =>
          prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
        );
        setStats(prev => ({
          ...prev,
          completedToday: newStatus === 'done'
            ? prev.completedToday + 1
            : prev.completedToday - 1,
        }));
      }
    } catch {
      // Silencioso
    }
  };

  // Iniciar Pomodoro com tarefa
  const startPomodoro = (task) => {
    setActiveTask(task);
    setShowPomodoro(true);
  };

  // Fechar "Start your Day"
  const closeStartDay = () => {
    const today = new Date().toDateString();
    localStorage.setItem('webfullsec_last_start', today);
    setShowStartDay(false);
  };

  const greeting = getGreeting();
  const todayDate = formatDate(new Date(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <AppShell pageTitle={`${greeting} 👋`}>
      {/* ================================
          Modal "Start your Day"
          ================================ */}
      {showStartDay && (
        <div className="ritual-overlay" role="dialog" aria-modal="true" aria-label="Início do dia">
          <div className="ritual-card">
            <div className="ritual-header">
              <h2 className="ritual-greeting">{greeting}! ☀️</h2>
              <p className="ritual-date">{todayDate}</p>
            </div>
            <div className="ritual-body">
              <div className="ritual-section">
                <h3 className="ritual-section-title">📊 Resumo do Dia</h3>
                <div className="ritual-stat-row">
                  <span className="ritual-stat-label">Tarefas planejadas</span>
                  <span className="ritual-stat-value">{todayTasks.length}</span>
                </div>
                <div className="ritual-stat-row">
                  <span className="ritual-stat-label">Carga estimada</span>
                  <span className="ritual-stat-value">
                    {formatMinutes(todayTasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0))}
                  </span>
                </div>
                <div className="ritual-stat-row">
                  <span className="ritual-stat-label">Projetos ativos</span>
                  <span className="ritual-stat-value">{stats.totalProjects}</span>
                </div>
                <div className="ritual-stat-row">
                  <span className="ritual-stat-label">Inbox não lidos</span>
                  <span className="ritual-stat-value" style={{
                    color: stats.inboxUnread > 0 ? 'var(--warning)' : 'var(--success)'
                  }}>
                    {stats.inboxUnread}
                  </span>
                </div>
              </div>

              {todayTasks.length > 0 && (
                <div className="ritual-section">
                  <h3 className="ritual-section-title">🎯 Foco Principal</h3>
                  <div style={{
                    background: 'var(--accent-glow)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                  }}>
                    <strong style={{ color: 'var(--accent)' }}>
                      {todayTasks[0]?.title || 'Nenhuma tarefa prioritária'}
                    </strong>
                    {todayTasks[0]?.estimatedTime && (
                      <span style={{
                        display: 'block',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                        marginTop: '4px',
                      }}>
                        ⏱ {formatMinutes(todayTasks[0].estimatedTime)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="ritual-footer">
              <button className="btn btn-primary btn-lg" onClick={closeStartDay}>
                🚀 Começar o Dia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================
          Cards de Métricas
          ================================ */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="stat-card" style={{ '--stat-color': 'var(--accent)' }}>
          <div className="stat-icon">📋</div>
          <div className="stat-value">{stats.totalTasks}</div>
          <div className="stat-label">Tarefas Hoje</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': 'var(--success)' }}>
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.completedToday}</div>
          <div className="stat-label">Concluídas</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': 'var(--warning)' }}>
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">Em Progresso</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': 'var(--danger)' }}>
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{stats.overdue}</div>
          <div className="stat-label">Atrasadas</div>
        </div>
      </div>

      {/* ================================
          Grid de conteúdo principal
          ================================ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: 'var(--space-lg)',
        alignItems: 'start',
      }}>
        {/* Coluna esquerda: Tarefas do dia */}
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">🎯 Tarefas de Hoje</h2>
              <a href="/tasks" className="btn btn-ghost btn-sm">Ver todas →</a>
            </div>

            {loading ? (
              <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                <div className="spinner" />
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Carregando...</p>
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p className="empty-state-title">Nenhuma tarefa para hoje</p>
                <p className="empty-state-text">
                  Adicione tarefas ou use o auto-agendamento para preencher seu dia.
                </p>
                <a href="/tasks" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>
                  + Nova Tarefa
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {todayTasks.map(task => (
                  <div key={task.id} className="task-item">
                    <button
                      className={`task-check ${task.status === 'done' ? 'done' : ''}`}
                      onClick={() => toggleTask(task.id, task.status)}
                      aria-label={task.status === 'done' ? 'Marcar como pendente' : 'Marcar como concluída'}
                    />
                    <div className="task-info">
                      <div className={`task-title ${task.status === 'done' ? 'done' : ''}`}>
                        {task.title}
                      </div>
                      <div className="task-meta">
                        <span
                          className="task-priority-dot"
                          style={{ background: getPriorityColor(task.priority) }}
                        />
                        {task.estimatedTime && (
                          <span>⏱ {formatMinutes(task.estimatedTime)}</span>
                        )}
                        {task.project && (
                          <span>📁 {task.project.title}</span>
                        )}
                      </div>
                    </div>
                    <div className="task-actions">
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => startPomodoro(task)}
                        title="Iniciar Pomodoro"
                        aria-label="Iniciar Pomodoro para esta tarefa"
                      >
                        🍅
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Projetos ativos */}
          <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
            <div className="card-header">
              <h2 className="card-title">📁 Projetos Ativos</h2>
              <a href="/projects" className="btn btn-ghost btn-sm">Ver todos →</a>
            </div>

            {recentProjects.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                <p className="empty-state-text">Nenhum projeto ativo no momento.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {recentProjects.map(project => {
                  const categoryIcons = { site: '🌐', automation: '⚡', beat: '🎵' };
                  const completedTasks = project._count?.completedTasks || 0;
                  const totalTasks = project._count?.tasks || 0;
                  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                  return (
                    <a
                      key={project.id}
                      href={`/projects/${project.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        padding: 'var(--space-md)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span style={{ fontSize: 'var(--text-lg)' }}>
                        {categoryIcons[project.category] || '📁'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}>
                          {project.title}
                        </div>
                        <div style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                        }}>
                          {project.client?.name || 'Sem cliente'} • {completedTasks}/{totalTasks} tarefas
                        </div>
                        {totalTasks > 0 && (
                          <div className="progress-bar" style={{ marginTop: '6px' }}>
                            <div
                              className={`progress-fill ${progress === 100 ? 'success' : ''}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <span className="font-mono" style={{
                        fontSize: 'var(--text-sm)',
                        color: progress === 100 ? 'var(--success)' : 'var(--accent)',
                        fontWeight: 700,
                      }}>
                        {progress}%
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita: Pomodoro + Capacidade */}
        <div>
          {/* Widget Pomodoro */}
          {showPomodoro ? (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <PomodoroTimer taskTitle={activeTask?.title || ''} />
              <button
                className="btn btn-ghost btn-sm w-full"
                onClick={() => { setShowPomodoro(false); setActiveTask(null); }}
                style={{ marginTop: 'var(--space-sm)' }}
              >
                Fechar Pomodoro
              </button>
            </div>
          ) : (
            <div
              className="card card-glow"
              style={{
                marginBottom: 'var(--space-lg)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
              onClick={() => setShowPomodoro(true)}
            >
              <div style={{
                fontSize: 'var(--text-4xl)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                color: 'var(--accent)',
                textShadow: '0 0 20px rgba(0, 229, 255, 0.3)',
              }}>
                25:00
              </div>
              <p style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
                marginTop: 'var(--space-sm)',
              }}>
                Clique para iniciar o Pomodoro
              </p>
            </div>
          )}

          {/* Card de Capacidade */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">⚡ Capacidade</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: 'var(--text-xs)',
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Horas planejadas</span>
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {formatMinutes(todayTasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0))} / 8h
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${
                      todayTasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0) > 480
                        ? 'danger'
                        : ''
                    }`}
                    style={{
                      width: `${Math.min(
                        (todayTasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0) / 480) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: 'var(--text-xs)',
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tarefas concluídas</span>
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {stats.completedToday}/{todayTasks.length}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill success"
                    style={{
                      width: `${todayTasks.length > 0
                        ? (stats.completedToday / todayTasks.length) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card de Informações */}
          <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
            <div className="card-header">
              <h3 className="card-title">ℹ️ Sistema</h3>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-sm)',
              fontSize: 'var(--text-xs)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Clientes ativos</span>
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{stats.activeClients}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Projetos totais</span>
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{stats.totalProjects}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Inbox pendente</span>
                <span className="font-mono" style={{
                  color: stats.inboxUnread > 0 ? 'var(--warning)' : 'var(--success)',
                }}>
                  {stats.inboxUnread}
                </span>
              </div>
              <div style={{
                borderTop: '1px solid var(--border)',
                paddingTop: 'var(--space-sm)',
                marginTop: 'var(--space-xs)',
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}>
                Webfull © {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsividade inline para o grid */}
      <style jsx>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns: 1fr 380px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
