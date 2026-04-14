'use client';

/**
 * ============================================
 * WebfullSec — AI File Organizer (Organizador de Arquivos)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Página principal do organizador inteligente de arquivos.
 * Interface em 4 etapas: Selecionar → Destino → Modo → Resultado
 * Funcionalidades:
 * - Escaneamento de diretórios
 * - Renomeação inteligente com IA
 * - Criação automática de pastas por categoria
 * - Detecção de duplicados
 * - Agendamento automático
 * - 100% local e privado
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';

/** Mapeamento de extensão → ícone emoji */
const EXT_ICONS = {
  '.pdf': '📄', '.docx': '📝', '.doc': '📝', '.xlsx': '📊', '.xls': '📊',
  '.pptx': '📽️', '.txt': '📃', '.md': '📃', '.html': '🌐', '.xml': '📋',
  '.json': '🔧', '.csv': '📈', '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️',
  '.gif': '🖼️', '.webp': '🖼️', '.bmp': '🖼️', '.svg': '🎨', '.mp4': '🎬',
  '.mp3': '🎵', '.zip': '📦', '.rar': '📦',
};

/** Retorna ícone para a extensão */
function getFileIcon(ext) {
  return EXT_ICONS[ext?.toLowerCase()] || '📎';
}

/** Nomes dos dias da semana (PT-BR) */
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function FilesPage() {
  // ================================
  // Estado da aplicação
  // ================================
  const [step, setStep] = useState(1);           // Etapa atual (1-4)
  const [sourcePath, setSourcePath] = useState('');
  const [destPath, setDestPath] = useState('');
  const [files, setFiles] = useState([]);
  const [scanStats, setScanStats] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [duplicates, setDuplicates] = useState(null);
  const [detectingDups, setDetectingDups] = useState(false);
  const [movingDups, setMovingDups] = useState(false);
  const [mode, setMode] = useState('ai');         // ai, duplicates
  const [createCategories, setCreateCategories] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Estado de agendamento
  const [schedules, setSchedules] = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedDays, setSchedDays] = useState([1]); // Segunda por padrão
  const [schedHour, setSchedHour] = useState(2);
  const [schedMinute, setSchedMinute] = useState(0);

  const pollRef = useRef(null);

  // ================================
  // Carregar histórico de jobs na montagem
  // ================================
  useEffect(() => {
    loadSchedules();
  }, []);

  // ================================
  // Polling do progresso do job
  // ================================
  useEffect(() => {
    if (jobId && organizing) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/files/status?jobId=${jobId}`);
          if (res.ok) {
            const data = await res.json();
            setJobStatus(data);
            if (data.status === 'completed' || data.status === 'failed') {
              setOrganizing(false);
              clearInterval(pollRef.current);
            }
          }
        } catch {
          // Continuar polling
        }
      }, 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, organizing]);

  // ================================
  // Handlers
  // ================================

  /** Escanear diretório */
  const handleScan = useCallback(async () => {
    if (!sourcePath.trim()) return;
    setScanning(true);
    setError(null);
    setFiles([]);
    setScanStats(null);

    try {
      const res = await fetch('/api/files/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: sourcePath.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao escanear o diretório.');
        return;
      }

      setFiles(data.files);
      setScanStats(data.stats);
      // Sugestão de destino
      if (!destPath) {
        setDestPath(sourcePath.trim().replace(/[/\\]$/, '') + '_Organizado');
      }
      setStep(2);
    } catch (err) {
      setError('Erro de conexão: ' + err.message);
    } finally {
      setScanning(false);
    }
  }, [sourcePath, destPath]);

  /** Iniciar organização com IA */
  const handleOrganize = useCallback(async () => {
    setOrganizing(true);
    setError(null);
    setJobStatus(null);

    try {
      const res = await fetch('/api/files/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: sourcePath.trim(),
          destPath: destPath.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao iniciar organização.');
        setOrganizing(false);
        return;
      }

      setJobId(data.jobId);
      setStep(4);
    } catch (err) {
      setError('Erro de conexão: ' + err.message);
      setOrganizing(false);
    }
  }, [sourcePath, destPath]);

  /** Detectar duplicados */
  const handleDetectDuplicates = useCallback(async () => {
    setDetectingDups(true);
    setError(null);
    setDuplicates(null);

    try {
      const res = await fetch('/api/files/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: sourcePath.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao detectar duplicados.');
        return;
      }

      setDuplicates(data);
      setStep(4);
    } catch (err) {
      setError('Erro de conexão: ' + err.message);
    } finally {
      setDetectingDups(false);
    }
  }, [sourcePath]);

  /** Mover duplicados */
  const handleMoveDuplicates = useCallback(async () => {
    setMovingDups(true);
    setError(null);

    try {
      const res = await fetch('/api/files/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: sourcePath.trim(),
          move: true,
          destPath: destPath.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao mover duplicados.');
        return;
      }

      setDuplicates(data);
    } catch (err) {
      setError('Erro de conexão: ' + err.message);
    } finally {
      setMovingDups(false);
    }
  }, [sourcePath, destPath]);

  /** Carregar agendamentos */
  const loadSchedules = async () => {
    try {
      const res = await fetch('/api/files/schedules');
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch {
      // Silencioso
    }
  };

  /** Criar agendamento */
  const handleCreateSchedule = async () => {
    if (!sourcePath.trim() || !destPath.trim()) return;

    try {
      const res = await fetch('/api/files/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: sourcePath.trim(),
          destPath: destPath.trim(),
          daysOfWeek: schedDays,
          hour: schedHour,
          minute: schedMinute,
        }),
      });

      if (res.ok) {
        setShowSchedule(false);
        loadSchedules();
      }
    } catch {
      setError('Erro ao criar agendamento.');
    }
  };

  /** Toggle dia da semana no agendamento */
  const toggleDay = (day) => {
    setSchedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  /** Deletar agendamento */
  const handleDeleteSchedule = async (id) => {
    try {
      await fetch(`/api/files/schedules?id=${id}`, { method: 'DELETE' });
      loadSchedules();
    } catch {
      // Silencioso
    }
  };

  /** Voltar para etapa anterior */
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  /** Reiniciar fluxo */
  const resetFlow = () => {
    setStep(1);
    setFiles([]);
    setScanStats(null);
    setJobId(null);
    setJobStatus(null);
    setDuplicates(null);
    setError(null);
    setOrganizing(false);
  };

  // ================================
  // Renderização
  // ================================
  return (
    <AppShell pageTitle="🗂️ Organizador AI de Arquivos">
      {/* Mensagem de erro global */}
      {error && (
        <div className="file-error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Cards de estatísticas do topo */}
      <div className="file-stats-grid">
        <div className="file-stat-card">
          <div className="file-stat-icon">📁</div>
          <div className="file-stat-value">{scanStats?.totalFiles ?? '—'}</div>
          <div className="file-stat-label">Arquivos Encontrados</div>
        </div>
        <div className="file-stat-card">
          <div className="file-stat-icon">🤖</div>
          <div className="file-stat-value">{scanStats?.supportedFiles ?? '—'}</div>
          <div className="file-stat-label">Suportados pela IA</div>
        </div>
        <div className="file-stat-card">
          <div className="file-stat-icon">📑</div>
          <div className="file-stat-value">{scanStats?.extensions?.length ?? '—'}</div>
          <div className="file-stat-label">Tipos de Arquivo</div>
        </div>
        <div className="file-stat-card">
          <div className="file-stat-icon">🔒</div>
          <div className="file-stat-value">100%</div>
          <div className="file-stat-label">Local & Privado</div>
        </div>
      </div>

      {/* Indicador de etapas */}
      <div className="file-steps-indicator">
        {[
          { num: 1, label: 'Selecionar' },
          { num: 2, label: 'Destino' },
          { num: 3, label: 'Modo' },
          { num: 4, label: 'Resultado' },
        ].map(s => (
          <div
            key={s.num}
            className={`file-step-dot ${step >= s.num ? 'active' : ''} ${step === s.num ? 'current' : ''}`}
          >
            <div className="file-step-number">{s.num}</div>
            <span className="file-step-label">{s.label}</span>
          </div>
        ))}
        <div className="file-steps-line">
          <div className="file-steps-line-fill" style={{ width: `${((step - 1) / 3) * 100}%` }} />
        </div>
      </div>

      {/* ================================
          ETAPA 1 — Selecionar pasta de origem
          ================================ */}
      {step === 1 && (
        <div className="card file-step-card">
          <div className="card-header">
            <h2 className="card-title">📂 Etapa 1 — Selecionar Pasta de Origem</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', fontSize: 'var(--text-sm)' }}>
            Informe o caminho completo da pasta com os arquivos que deseja organizar.
            A IA vai ler o conteúdo de cada arquivo, entender do que se trata e criar nomes descritivos.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="source-path">Caminho da Pasta</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <input
                id="source-path"
                type="text"
                className="form-input"
                placeholder="Ex: C:\Users\SeuNome\Downloads"
                value={sourcePath}
                onChange={e => setSourcePath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                autoFocus
              />
              <button
                className="btn btn-primary"
                onClick={handleScan}
                disabled={scanning || !sourcePath.trim()}
              >
                {scanning ? (
                  <><span className="spinner-sm" /> Escaneando...</>
                ) : (
                  '🔍 Escanear'
                )}
              </button>
            </div>
          </div>

          {/* Dicas */}
          <div className="file-tips">
            <h4 style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontSize: 'var(--text-sm)' }}>💡 Formatos suportados:</h4>
            <div className="file-format-tags">
              {['PDF', 'Word', 'Excel', 'Imagens (OCR)', 'HTML', 'XML', 'JSON', 'CSV', 'TXT', 'Markdown'].map(f => (
                <span key={f} className="file-format-tag">{f}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================
          ETAPA 2 — Destino + Preview dos arquivos
          ================================ */}
      {step === 2 && (
        <div className="card file-step-card">
          <div className="card-header">
            <h2 className="card-title">📍 Etapa 2 — Pasta de Destino</h2>
            <button className="btn btn-ghost btn-sm" onClick={goBack}>← Voltar</button>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="form-label" htmlFor="dest-path">Caminho de Destino</label>
            <input
              id="dest-path"
              type="text"
              className="form-input"
              placeholder="Ex: C:\Users\SeuNome\Documentos_Organizado"
              value={destPath}
              onChange={e => setDestPath(e.target.value)}
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              As pastas serão criadas automaticamente. Arquivos originais serão movidos (não copiados).
            </span>
          </div>

          {/* Lista de arquivos encontrados */}
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
              📋 {files.length} arquivos encontrados:
            </h3>
            <div className="file-list-container">
              {files.slice(0, 100).map((file, i) => (
                <div key={i} className={`file-list-item ${!file.isSupported ? 'unsupported' : ''}`}>
                  <span className="file-list-icon">{getFileIcon(file.extension)}</span>
                  <span className="file-list-name" title={file.path}>{file.name}</span>
                  <span className="file-list-size">{file.sizeFormatted}</span>
                  <span className={`file-list-badge ${file.isSupported ? 'supported' : 'unsupported'}`}>
                    {file.isSupported ? '✓ IA' : '—'}
                  </span>
                </div>
              ))}
              {files.length > 100 && (
                <div className="file-list-more">
                  ... e mais {files.length - 100} arquivos
                </div>
              )}
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={() => setStep(3)}
            disabled={!destPath.trim()}
            style={{ width: '100%' }}
          >
            Avançar para Modo de Organização →
          </button>
        </div>
      )}

      {/* ================================
          ETAPA 3 — Modo de organização
          ================================ */}
      {step === 3 && (
        <div className="card file-step-card">
          <div className="card-header">
            <h2 className="card-title">⚙️ Etapa 3 — Modo de Organização</h2>
            <button className="btn btn-ghost btn-sm" onClick={goBack}>← Voltar</button>
          </div>

          {/* Cards de modo */}
          <div className="file-mode-grid">
            <div
              className={`file-mode-card ${mode === 'ai' ? 'active' : ''}`}
              onClick={() => setMode('ai')}
              role="button"
              tabIndex={0}
              aria-pressed={mode === 'ai'}
            >
              <div className="file-mode-icon">🤖</div>
              <h3 className="file-mode-title">Renomear com IA</h3>
              <p className="file-mode-desc">
                A IA lê o conteúdo de cada arquivo, entende do que se trata e cria nomes descritivos.
                Arquivos são organizados em pastas por categoria automaticamente.
              </p>
              <div className="file-mode-features">
                <span>✓ Leitura de conteúdo</span>
                <span>✓ Nomes inteligentes</span>
                <span>✓ Pastas por categoria</span>
              </div>
            </div>

            <div
              className={`file-mode-card ${mode === 'duplicates' ? 'active' : ''}`}
              onClick={() => setMode('duplicates')}
              role="button"
              tabIndex={0}
              aria-pressed={mode === 'duplicates'}
            >
              <div className="file-mode-icon">🔍</div>
              <h3 className="file-mode-title">Detectar Duplicados</h3>
              <p className="file-mode-desc">
                Encontra arquivos idênticos usando hash SHA-256. Duplicatas são movidas para
                uma pasta separada — nada é apagado sem sua permissão.
              </p>
              <div className="file-mode-features">
                <span>✓ Hash preciso</span>
                <span>✓ Zero perda de dados</span>
                <span>✓ Libera espaço</span>
              </div>
            </div>
          </div>

          {/* Toggle de categorias */}
          {mode === 'ai' && (
            <label className="file-toggle-row" htmlFor="toggle-categories">
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                📁 Criar pastas por categoria automaticamente
              </span>
              <input
                id="toggle-categories"
                type="checkbox"
                checked={createCategories}
                onChange={e => setCreateCategories(e.target.checked)}
                className="file-toggle"
              />
            </label>
          )}

          {/* Card de agendamento */}
          <div className="file-schedule-section">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowSchedule(!showSchedule)}
            >
              ⏰ {showSchedule ? 'Ocultar Agendamento' : 'Configurar Agendamento Automático'}
            </button>

            {showSchedule && (
              <div className="file-schedule-card">
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontSize: 'var(--text-sm)' }}>
                  Agendar organização recorrente:
                </h4>
                <div className="file-schedule-days">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      className={`file-day-btn ${schedDays.includes(i) ? 'active' : ''}`}
                      onClick={() => toggleDay(i)}
                      aria-label={label}
                      aria-pressed={schedDays.includes(i)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                  <label className="form-label" style={{ margin: 0 }}>Horário:</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '70px' }}
                    min={0}
                    max={23}
                    value={schedHour}
                    onChange={e => setSchedHour(parseInt(e.target.value) || 0)}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>:</span>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '70px' }}
                    min={0}
                    max={59}
                    value={schedMinute}
                    onChange={e => setSchedMinute(parseInt(e.target.value) || 0)}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleCreateSchedule}>
                    Salvar Agendamento
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Agendamentos existentes */}
          {schedules.length > 0 && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontSize: 'var(--text-sm)' }}>
                📅 Agendamentos ativos:
              </h4>
              {schedules.map(sched => (
                <div key={sched.id} className="file-schedule-item">
                  <div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                      {sched.sourcePath}
                    </strong>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      → {sched.destPath} | {sched.daysOfWeek?.map(d => DAY_LABELS[d]).join(', ')} às {String(sched.hour).padStart(2, '0')}:{String(sched.minute).padStart(2, '0')}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDeleteSchedule(sched.id)}
                    aria-label="Remover agendamento"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Botão de execução */}
          <button
            className="btn btn-primary btn-lg"
            onClick={mode === 'ai' ? handleOrganize : handleDetectDuplicates}
            disabled={organizing || detectingDups}
            style={{ width: '100%', marginTop: 'var(--space-lg)' }}
          >
            {organizing || detectingDups ? (
              <><span className="spinner-sm" /> Processando...</>
            ) : mode === 'ai' ? (
              '🚀 Iniciar Organização com IA'
            ) : (
              '🔍 Detectar Duplicados'
            )}
          </button>
        </div>
      )}

      {/* ================================
          ETAPA 4 — Resultados
          ================================ */}
      {step === 4 && (
        <div className="card file-step-card">
          <div className="card-header">
            <h2 className="card-title">
              {jobStatus?.status === 'completed' ? '✅ Organização Concluída!' :
               jobStatus?.status === 'failed' ? '❌ Erro na Organização' :
               duplicates ? '🔍 Resultado dos Duplicados' :
               '⏳ Organizando Arquivos...'}
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={resetFlow}>🔄 Nova Organização</button>
          </div>

          {/* Progress bar (para modo AI) */}
          {organizing && jobStatus && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Progresso</span>
                <span className="font-mono" style={{ color: 'var(--accent)' }}>
                  {jobStatus.processedFiles}/{jobStatus.totalFiles} ({jobStatus.progress}%)
                </span>
              </div>
              <div className="progress-bar" style={{ height: '8px' }}>
                <div
                  className="progress-fill"
                  style={{ width: `${jobStatus.progress}%`, transition: 'width 0.5s ease' }}
                />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-xs)' }}>
                A IA está lendo e analisando cada arquivo... Isso pode levar alguns minutos.
              </p>
            </div>
          )}

          {/* Resultados da organização com IA */}
          {jobStatus?.status === 'completed' && jobStatus.results?.length > 0 && (
            <div className="file-results-section">
              <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                📋 {jobStatus.results.filter(r => r.status === 'success').length} arquivos organizados com sucesso:
              </h3>
              <div className="file-result-table-container">
                <table className="file-result-table">
                  <thead>
                    <tr>
                      <th>Nome Original</th>
                      <th>Novo Nome</th>
                      <th>Categoria</th>
                      <th>Confiança</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobStatus.results.map((r, i) => (
                      <tr key={i} className={r.status === 'error' ? 'error-row' : ''}>
                        <td>
                          <span className="file-result-original" title={r.originalPath}>
                            {r.originalName}
                          </span>
                        </td>
                        <td>
                          <span className="file-result-new">
                            {r.newName || '—'}
                          </span>
                        </td>
                        <td>
                          {r.category && (
                            <span className="file-category-badge">{r.category}</span>
                          )}
                        </td>
                        <td>
                          {r.confidence > 0 && (
                            <span className={`file-confidence ${r.confidence >= 70 ? 'high' : r.confidence >= 40 ? 'medium' : 'low'}`}>
                              {r.confidence}%
                            </span>
                          )}
                          {r.status === 'error' && (
                            <span className="file-confidence low" title={r.error}>Erro</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Erro no job */}
          {jobStatus?.status === 'failed' && (
            <div className="file-error-banner" style={{ marginBottom: 'var(--space-md)' }}>
              <span>❌ {jobStatus.errorLog || 'Erro desconhecido durante a organização.'}</span>
            </div>
          )}

          {/* Resultados de duplicados */}
          {duplicates && (
            <div className="file-results-section">
              <div className="file-stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="file-stat-card">
                  <div className="file-stat-icon">📑</div>
                  <div className="file-stat-value">{duplicates.duplicateGroups}</div>
                  <div className="file-stat-label">Grupos Duplicados</div>
                </div>
                <div className="file-stat-card">
                  <div className="file-stat-icon">📋</div>
                  <div className="file-stat-value">{duplicates.totalDuplicateFiles}</div>
                  <div className="file-stat-label">Arquivos Duplicados</div>
                </div>
              </div>

              {duplicates.duplicateGroups === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                  <div className="empty-state-icon">✨</div>
                  <p className="empty-state-title">Nenhum duplicado encontrado!</p>
                  <p className="empty-state-text">Todos os arquivos nesta pasta são únicos.</p>
                </div>
              ) : (
                <>
                  {duplicates.duplicates?.map((group, i) => (
                    <div key={i} className="file-dup-group">
                      <div className="file-dup-header">
                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                          Grupo {i + 1} — {group.count} cópias ({group.sizeFormatted} cada)
                        </span>
                      </div>
                      {group.files?.map((file, j) => (
                        <div key={j} className={`file-list-item ${j === 0 ? 'original' : 'duplicate'}`}>
                          <span className="file-list-icon">{j === 0 ? '✅' : '📋'}</span>
                          <span className="file-list-name" title={file.path}>{file.name}</span>
                          <span className="file-list-badge" style={{
                            background: j === 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                            color: j === 0 ? 'var(--success)' : 'var(--danger)',
                          }}>
                            {j === 0 ? 'Original' : 'Duplicado'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Botão para mover duplicados */}
                  {!duplicates.moveResult && (
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={handleMoveDuplicates}
                      disabled={movingDups}
                      style={{ width: '100%', marginTop: 'var(--space-md)' }}
                    >
                      {movingDups ? (
                        <><span className="spinner-sm" /> Movendo duplicados...</>
                      ) : (
                        `📦 Mover ${duplicates.totalDuplicateFiles} duplicados para pasta separada`
                      )}
                    </button>
                  )}

                  {duplicates.moveResult && (
                    <div className="file-success-banner">
                      ✅ {duplicates.moveResult.moved} duplicados movidos para: {duplicates.moveResult.duplicatesFolder}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
