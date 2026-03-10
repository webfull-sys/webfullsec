'use client';
/**
 * WebfullSec — Página de Configurações
 * Autoria: Webfull (https://webfull.com.br) | v1.0.0
 */
import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { APP_VERSION } from '@/lib/constants';

export default function SettingsPage() {
  const [form, setForm] = useState({
    workStartHour: 9, workEndHour: 18, pomodoroWork: 25, pomodoroBreak: 5, timezone: 'America/Sao_Paulo',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    // Placeholder — salvar no banco via API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell pageTitle="Configurações">
      <div className="page-header">
        <h2 className="page-title">⚙️ Configurações</h2>
      </div>

      <div style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSave}>
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>🕐 Horário Comercial</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="s-start">Início do expediente</label>
                <input id="s-start" className="form-input" type="number" min="0" max="23" value={form.workStartHour} onChange={e => setForm({ ...form, workStartHour: parseInt(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="s-end">Fim do expediente</label>
                <input id="s-end" className="form-input" type="number" min="0" max="23" value={form.workEndHour} onChange={e => setForm({ ...form, workEndHour: parseInt(e.target.value) })} />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>🍅 Pomodoro</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="s-pwork">Foco (min)</label>
                <input id="s-pwork" className="form-input" type="number" min="1" max="120" value={form.pomodoroWork} onChange={e => setForm({ ...form, pomodoroWork: parseInt(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="s-pbreak">Pausa (min)</label>
                <input id="s-pbreak" className="form-input" type="number" min="1" max="60" value={form.pomodoroBreak} onChange={e => setForm({ ...form, pomodoroBreak: parseInt(e.target.value) })} />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>🌐 Fuso Horário</h3>
            <div className="form-group">
              <select className="form-select" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                <option value="America/Manaus">Manaus (GMT-4)</option>
                <option value="America/Bahia">Bahia (GMT-3)</option>
                <option value="America/Fortaleza">Fortaleza (GMT-3)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full">
            {saved ? '✅ Salvo!' : '💾 Salvar Configurações'}
          </button>
        </form>

        <div className="card" style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            WebfullSec v{APP_VERSION}<br />
            Desenvolvido por <a href="https://webfull.com.br" target="_blank" rel="noopener noreferrer">Webfull</a>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
