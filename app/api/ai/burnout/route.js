/**
 * ============================================
 * WebfullSec — API: Burnout Score & Analytics
 * GET /api/ai/burnout — Score atual + analytics
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.3.0
 * ============================================
 */

import { calculateBurnoutScore, getWeeklyAnalytics } from '@/lib/burnout-guardian';
import { apiResponse, apiError } from '@/lib/utils';

/**
 * GET /api/ai/burnout
 * Query: weekly=true — Retorna analytics semanal
 * Sem query — Retorna score de burnout atual
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekly = searchParams.get('weekly');

    if (weekly === 'true') {
      // Analytics semanal
      const analytics = await getWeeklyAnalytics();
      return apiResponse(analytics);
    }

    // Score de burnout atual
    const burnout = await calculateBurnoutScore();
    return apiResponse(burnout);
  } catch (error) {
    console.error('Erro ao calcular burnout:', error);
    return apiError(`Erro ao calcular burnout: ${error.message}`, 500);
  }
}
