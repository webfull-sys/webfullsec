/**
 * ============================================
 * WebfullSec — Cliente N8N (Outbound)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 * Serviço centralizado para disparar Webhooks do N8N
 * a partir das interações do usuário no painel.
 */

const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL || 'https://n8nwebfullsec.webfullvps.com.br/webhook';

/**
 * Dispara um webhook no servidor N8N
 * @param {string} webhookPath - Caminho do webhook no N8N (exp: 'pm-agent' ou id-do-node)
 * @param {object} payload - Dados JSON para enviar ao agente
 * @param {string} method - Método HTTP (padrão: POST)
 * @returns {Promise<object>} - Resposta do N8N
 */
export async function triggerN8nWebhook(webhookPath, payload = {}, method = 'POST') {
  try {
    // Remove barras duplas se houver erro de formatação
    const url = `${N8N_BASE_URL}/${webhookPath}`.replace(/([^:]\/)\/+/g, "$1");

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Podemos adicionar headers extras caso o HTTP Request Node no N8N exija autenticação futuramente
        'X-Webfull-Source': 'WebfullSec-Dashboard',
      },
      body: method !== 'GET' ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[N8N Client] Erro chamando webhook ${webhookPath}:`, response.status, errorText);
      throw new Error(`Erro N8N (${response.status}): Falha na comunicação com agente.`);
    }

    // N8N as vezes responde apenas texto vazio ou "Workflow got started."
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return { success: true, text: await response.text() };
    }
  } catch (error) {
    console.error(`[N8N Client] Exceção estrutural ao chamar webhook ${webhookPath}:`, error);
    throw error;
  }
}

/**
 * Mapeamento centralizado de Webhooks conhecidos dos agentes
 * Isso evita espalhar UUIDs pelo código React.
 */
export const N8N_WORKFLOWS = {
  // Webhooks de Assistentes (Responder diretamente ao chat)
  CONTENT_AGENT: 'content-agent-chat', // ID de ex: hcFQu03Nzvlbm67j webhook
  PM_AGENT: 'pm-agent-command',       // ID de ex: Usac6Ey1Ff0gEmS8 webhook
  
  // Webhooks de Produtividade/Ações (Background jobs engatilhados pela UI)
  DELIVER_BEATS: 'deliver-beats',
  INTAKE_VOICE: 'intake-voice',
};
