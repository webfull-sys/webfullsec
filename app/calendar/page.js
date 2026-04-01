'use client';
/**
 * WebfullSec — Página de Calendário (TimeBlocking)
 * Autoria: Webfull (https://webfull.com.br) | v1.0.0
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { formatDate } from '@/lib/utils';

export default function CalendarPage() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', startTime: '', endTime: '', color: '#00e5ff' });

  const workStart = 9, workEnd = 18;
  const hours = useMemo(() => Array.from({ length: 17 }, (_, i) => i + 6), []);
  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); days.push(d); }
    return days;
  }, [selectedDate]);

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    const end = new Date(weekDays[6]); end.setHours(23, 59, 59);
    try {
      const res = await fetch(`/api/timeblocks?start=${weekDays[0].toISOString()}&end=${end.toISOString()}`);
      if (res.ok) { const data = await res.json(); setBlocks(data.blocks || []); }
    } catch { /* silencioso */ }
    setLoading(false);
  }, [weekDays]);

  useEffect(() => {
    const timer = setTimeout(fetchBlocks, 0);
    return () => clearTimeout(timer);
  }, [fetchBlocks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/timeblocks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowModal(false); setForm({ title: '', startTime: '', endTime: '', color: '#00e5ff' }); fetchBlocks(); }
    } catch { /* silencioso */ }
  };

  const navWeek = (d) => { const n = new Date(selectedDate); n.setDate(n.getDate() + d * 7); setSelectedDate(n); };
  const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const isToday = (d) => d.toDateString() === new Date().toDateString();

  return (
    <AppShell pageTitle="Calendário">
      <div className="page-header">
        <div>
          <h2 className="page-title">📅 Calendário</h2>
          <p className="page-subtitle">{formatDate(weekDays[0], { day: 'numeric', month: 'short' })} — {formatDate(weekDays[6], { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navWeek(-1)}>← Anterior</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(new Date())}>Hoje</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navWeek(1)}>Próxima →</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ TimeBlock</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: '1px', background: 'var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', minWidth: '800px' }}>
          <div style={{ background: 'var(--bg-panel-alt)', padding: 'var(--space-sm)' }} />
          {weekDays.map((day, i) => (
            <div key={i} style={{ background: 'var(--bg-panel-alt)', padding: 'var(--space-sm)', textAlign: 'center', borderBottom: isToday(day) ? '2px solid var(--accent)' : 'none' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{dayNames[i]}</div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isToday(day) ? 'var(--accent)' : 'var(--text-primary)' }}>{day.getDate()}</div>
            </div>
          ))}
          {hours.map(hour => (
            <div key={hour} style={{ display: 'contents' }}>
              <div style={{ background: 'var(--bg-panel)', padding: '4px 8px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right', height: '48px', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                {String(hour).padStart(2, '0')}:00
              </div>
              {weekDays.map((day, di) => {
                const isWork = hour >= workStart && hour < workEnd;
                const dayBlocks = blocks.filter(b => { const bd = new Date(b.startTime); return bd.toDateString() === day.toDateString() && bd.getHours() === hour; });
                return (
                  <div key={di} style={{ background: isWork ? 'var(--bg-panel)' : 'var(--bg-deep)', height: '48px', position: 'relative', opacity: isWork ? 1 : 0.4, borderBottom: '1px solid var(--border-subtle)' }}>
                    {dayBlocks.map(b => (
                      <div key={b.id} style={{ position: 'absolute', left: 2, right: 2, top: `${(new Date(b.startTime).getMinutes() / 60) * 48}px`, height: `${Math.max(((new Date(b.endTime) - new Date(b.startTime)) / 3600000) * 48, 24)}px`, background: `${b.color}22`, borderLeft: `3px solid ${b.color}`, borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: 'var(--text-xs)', fontWeight: 600, color: b.color, overflow: 'hidden' }}>
                        {b.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-md)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        <span>🟦 Horário comercial ({workStart}h-{workEnd}h)</span>
        <span>⬛ Fora do expediente</span>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Novo TimeBlock</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="tb-title">Título *</label>
                  <input id="tb-title" className="form-input" type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required autoFocus />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="tb-s">Início *</label>
                    <input id="tb-s" className="form-input" type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="tb-e">Fim *</label>
                    <input id="tb-e" className="form-input" type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Cor</label>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    {['#00e5ff', '#00e676', '#ffab00', '#ff5252', '#e040fb', '#448aff'].map(c => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: form.color === c ? '3px solid white' : '2px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
