/**
 * ============================================
 * WebfullSec — ProjectProperties (Propriedades estilo Notion)
 * Painel de propriedades editáveis inline
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

'use client';

import { useState } from 'react';
import { PROJECT_STATUSES, PROJECT_CATEGORIES, PRIORITY_LEVELS, AGENT_ROLES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

function PropertyRow({ label, icon, value, children, fieldKey, editingField, setEditingField }) {
  return (
    <div className="notion-prop-row" onClick={() => setEditingField(fieldKey)}>
      <div className="notion-prop-label">
        <span className="notion-prop-icon">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="notion-prop-value">
        {editingField === fieldKey ? children : value}
      </div>
    </div>
  );
}

/**
 * ProjectProperties — Propriedades editáveis do projeto
 * @param {Object} props
 * @param {Object} props.project - Dados do projeto
 * @param {Array} props.clients - Lista de clientes disponíveis
 * @param {Array} props.agents - Lista de agentes disponíveis
 * @param {Function} props.onUpdate - Callback para atualizar propriedade
 * @param {Function} props.onLinkAgent - Callback para vincular agente
 * @param {Function} props.onUnlinkAgent - Callback para desvincular agente
 */
export default function ProjectProperties({
  project,
  clients = [],
  agents = [],
  onUpdate,
  onLinkAgent,
  onUnlinkAgent,
}) {
  const [editingField, setEditingField] = useState(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  // Encontrar labels dos valores atuais
  const currentStatus = PROJECT_STATUSES.find((s) => s.value === project.status);
  const currentCategory = PROJECT_CATEGORIES.find((c) => c.value === project.category);
  const currentPriority = PRIORITY_LEVELS.find((p) => p.value === project.priority);
  const currentClient = project?.client;
  const safeTags = Array.isArray(project?.tags) ? project.tags : (typeof project?.tags === 'string' ? JSON.parse(project.tags || '[]') : []);

  // Agentes vinculados ao projeto
  const linkedAgents = project.projectAgents || [];
  // Agentes disponíveis (não vinculados)
  const availableAgents = agents.filter(
    (a) => !linkedAgents.some((la) => la.agentId === a.id || la.agent?.id === a.id)
  );

  return (
    <div className="notion-properties" role="region" aria-label="Propriedades do projeto">
      {/* Status */}
      <PropertyRow label="Status" icon={currentStatus?.icon || '📋'} fieldKey="status" editingField={editingField} setEditingField={setEditingField}
        value={
          <span
            className={`badge badge-${project.status === 'completed' ? 'success' : project.status === 'in_progress' ? 'accent' : project.status === 'waiting_client' ? 'warning' : 'muted'}`}
          >
            {currentStatus?.label || project.status}
          </span>
        }
      >
        <select
          className="notion-prop-select"
          value={project.status}
          onChange={(e) => { onUpdate({ status: e.target.value }); setEditingField(null); }}
          onBlur={() => setEditingField(null)}
          autoFocus
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
          ))}
        </select>
      </PropertyRow>

      {/* Categoria */}
      <PropertyRow label="Categoria" icon="📂" fieldKey="category" editingField={editingField} setEditingField={setEditingField}
        value={<span>{currentCategory?.label || project.category}</span>}
      >
        <select
          className="notion-prop-select"
          value={project.category}
          onChange={(e) => { onUpdate({ category: e.target.value }); setEditingField(null); }}
          onBlur={() => setEditingField(null)}
          autoFocus
        >
          {PROJECT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </PropertyRow>

      {/* Prioridade */}
      <PropertyRow label="Prioridade" icon="🎯" fieldKey="priority" editingField={editingField} setEditingField={setEditingField}
        value={
          <span style={{ color: currentPriority?.color }}>
            {currentPriority?.icon} {currentPriority?.label}
          </span>
        }
      >
        <select
          className="notion-prop-select"
          value={project.priority}
          onChange={(e) => { onUpdate({ priority: parseInt(e.target.value) }); setEditingField(null); }}
          onBlur={() => setEditingField(null)}
          autoFocus
        >
          {PRIORITY_LEVELS.map((p) => (
            <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
          ))}
        </select>
      </PropertyRow>

      {/* Cliente */}
      <PropertyRow label="Cliente" icon="👤" fieldKey="client" editingField={editingField} setEditingField={setEditingField}
        value={<span>{currentClient?.name || currentClient?.nome_cliente || 'Nenhum'}</span>}
      >
        <select
          className="notion-prop-select"
          value={project?.clientId || ''}
          onChange={(e) => { 
            const val = e.target.value;
            onUpdate({ clientId: val === '' ? null : val }); 
            setEditingField(null); 
          }}
          onBlur={() => setEditingField(null)}
          autoFocus
        >
          <option value="">Nenhum</option>
          {clients && Array.isArray(clients) && clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name || c.nome_cliente}</option>
          ))}
        </select>
      </PropertyRow>

      {/* Data Início */}
      <PropertyRow label="Início" icon="📅" fieldKey="startDate" editingField={editingField} setEditingField={setEditingField}
        value={<span className="font-mono">{project.startDate ? formatDate(project.startDate) : '—'}</span>}
      >
        <input
          type="date"
          className="notion-prop-input"
          value={project?.startDate ? (isNaN(new Date(project.startDate).getTime()) ? '' : new Date(project.startDate).toISOString().split('T')[0]) : ''}
          onChange={(e) => { 
            const val = e.target.value;
            onUpdate({ startDate: val ? val : null }); 
            setEditingField(null); 
          }}
          onBlur={() => setEditingField(null)}
          autoFocus
        />
      </PropertyRow>

      {/* Prazo */}
      <PropertyRow label="Prazo" icon="⏰" fieldKey="dueDate" editingField={editingField} setEditingField={setEditingField}
        value={<span className="font-mono">{project.dueDate ? formatDate(project.dueDate) : '—'}</span>}
      >
        <input
          type="date"
          className="notion-prop-input"
          value={project?.dueDate ? (isNaN(new Date(project.dueDate).getTime()) ? '' : new Date(project.dueDate).toISOString().split('T')[0]) : ''}
          onChange={(e) => { 
            const val = e.target.value;
            onUpdate({ dueDate: val ? val : null }); 
            setEditingField(null); 
          }}
          onBlur={() => setEditingField(null)}
          autoFocus
        />
      </PropertyRow>

      {/* Tags */}
      <PropertyRow label="Tags" icon="🏷️" fieldKey="tags" editingField={editingField} setEditingField={setEditingField}
        value={
          <div className="notion-tags">
            {safeTags.map((tag, i) => (
              <span key={i} className="notion-tag">{tag}</span>
            ))}
            {safeTags.length === 0 && <span className="text-muted">Nenhuma</span>}
          </div>
        }
      >
        <input
          type="text"
          className="notion-prop-input"
          placeholder="Adicione tags separadas por vírgula"
          defaultValue={safeTags.join(', ')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
              onUpdate({ tags });
              setEditingField(null);
            }
          }}
          onBlur={(e) => {
            const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
            onUpdate({ tags });
            setEditingField(null);
          }}
          autoFocus
        />
      </PropertyRow>

      {/* Agentes Vinculados */}
      <div className="notion-prop-row notion-prop-agents">
        <div className="notion-prop-label">
          <span className="notion-prop-icon">🤖</span>
          <span>Agentes</span>
        </div>
        <div className="notion-prop-value notion-agents-list">
          {linkedAgents.map((pa) => (
            <div key={pa.id} className="notion-agent-chip">
              <span className="notion-agent-chip-name">
                {AGENT_ROLES.find((r) => r.value === pa.role)?.icon || '🤖'} {pa.agent?.name || 'Agente'}
              </span>
              <button
                className="notion-agent-chip-remove"
                onClick={() => onUnlinkAgent(pa.agent?.id || pa.agentId)}
                title="Remover agente"
                aria-label="Remover agente"
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="notion-agent-add-btn"
            onClick={() => setShowAgentPicker(!showAgentPicker)}
          >
            + Agente
          </button>

          {/* Picker de agentes */}
          {showAgentPicker && availableAgents.length > 0 && (
            <div className="notion-agent-picker">
              {availableAgents.map((a) => (
                <button
                  key={a.id}
                  className="notion-agent-picker-item"
                  onClick={() => { onLinkAgent(a.id); setShowAgentPicker(false); }}
                >
                  🤖 {a.name}
                  {a.description && <span className="text-muted"> — {a.description}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
