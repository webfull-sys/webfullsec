'use client';

/**
 * ============================================
 * WebfullSec — Timer Pomodoro
 * Timer visual 25/5 min com anel animado
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/** Circunferência do anel SVG */
const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Timer Pomodoro com anel circular animado
 * @param {object} props
 * @param {number} props.workMinutes - Duração do foco (padrão: 25)
 * @param {number} props.breakMinutes - Duração da pausa (padrão: 5)
 * @param {string} props.taskTitle - Nome da tarefa vinculada (opcional)
 */
export default function PomodoroTimer({ workMinutes = 25, breakMinutes = 5, taskTitle = '' }) {
  const [timeLeft, setTimeLeft] = useState(workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  const totalSeconds = isBreak ? breakMinutes * 60 : workMinutes * 60;
  const progress = 1 - (timeLeft / totalSeconds);
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Ao completar uma sessão, alterna entre foco e pausa
  const handleSessionComplete = useCallback(() => {
    // Tocar notificação sonora (se disponível)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = isBreak ? 880 : 440;
      gain.gain.value = 0.1;
      osc.start();
      setTimeout(() => osc.stop(), 200);
    } catch {
      // Silencioso se não suportar
    }

    if (!isBreak) {
      setSessionsCompleted(prev => prev + 1);
      setIsBreak(true);
      setTimeLeft(breakMinutes * 60);
    } else {
      setIsBreak(false);
      setTimeLeft(workMinutes * 60);
    }
    setIsRunning(false);
  }, [isBreak, breakMinutes, workMinutes]);

  // Timer principal
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(intervalRef.current);
      setTimeout(handleSessionComplete, 0);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, handleSessionComplete]);

  const toggleTimer = () => setIsRunning(prev => !prev);

  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(workMinutes * 60);
  };

  const skipToNext = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    if (!isBreak) {
      setIsBreak(true);
      setTimeLeft(breakMinutes * 60);
    } else {
      setIsBreak(false);
      setTimeLeft(workMinutes * 60);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">
            {isBreak ? '☕ Pausa' : '🎯 Foco'}
          </h3>
          {taskTitle && (
            <p className="card-subtitle" style={{ marginTop: '4px' }}>{taskTitle}</p>
          )}
        </div>
        <span className="badge badge-accent">
          {sessionsCompleted} sessões
        </span>
      </div>

      <div className="pomodoro-full">
        {/* Anel circular */}
        <div className="pomodoro-ring" role="timer" aria-label={`${minutes} minutos e ${seconds} segundos restantes`}>
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle
              className="pomodoro-ring-bg"
              cx="100" cy="100" r={RADIUS}
            />
            <circle
              className="pomodoro-ring-progress"
              cx="100" cy="100" r={RADIUS}
              style={{
                strokeDasharray: CIRCUMFERENCE,
                strokeDashoffset: dashOffset,
                stroke: isBreak ? 'var(--success)' : 'var(--accent)',
                filter: `drop-shadow(0 0 6px ${isBreak ? 'var(--success)' : 'var(--accent)'})`
              }}
            />
          </svg>
          <div className="pomodoro-ring-time">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        {/* Controles */}
        <div className="pomodoro-controls">
          <button
            className="btn btn-secondary btn-icon"
            onClick={resetTimer}
            title="Reiniciar"
            aria-label="Reiniciar timer"
          >
            ↺
          </button>
          <button
            className={`btn ${isRunning ? 'btn-danger' : 'btn-primary'} btn-lg`}
            onClick={toggleTimer}
            aria-label={isRunning ? 'Pausar timer' : 'Iniciar timer'}
          >
            {isRunning ? '⏸ Pausar' : '▶ Iniciar'}
          </button>
          <button
            className="btn btn-secondary btn-icon"
            onClick={skipToNext}
            title="Pular para próxima sessão"
            aria-label="Pular sessão"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}
