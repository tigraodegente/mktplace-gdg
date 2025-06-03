import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db/index.js';

const LOG_PREFIX = '[api_countdown]';

export interface CountdownData {
  id: string;
  name: string;
  text: string;
  endTime: string; // ISO string
  isActive: boolean;
  priority: number;
}

// Cache simples em memória (5 minutos)
let countdownCache: {
  data: CountdownData | null;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export const GET: RequestHandler = async ({ platform, url }) => {
  console.log(`[SERVER] [INFO]${LOG_PREFIX} Countdown API iniciada`);
  
  // Verificar cache
  if (countdownCache && (Date.now() - countdownCache.timestamp) < CACHE_TTL) {
    console.log(`[SERVER] [INFO]${LOG_PREFIX} ✅ Dados do cache: ${countdownCache.data ? 'countdown ativo' : 'nenhum countdown'}`);
    
    return json({
      success: true,
      data: countdownCache.data,
      cached: true
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutos
        'Vary': 'Accept-Encoding'
      }
    });
  }

  try {
    console.log(`🔌 Dev: NEON`);
    const db = getDatabase(platform);

    // Buscar countdown ativo que ainda não expirou
    const result = await db.query`
      SELECT 
        id,
        name,
        countdown_text,
        countdown_end_time,
        is_active,
        priority
      FROM marketing_campaigns 
      WHERE 
        type = 'countdown' 
        AND status = 'running'
        AND is_active = true 
        AND countdown_end_time > NOW()
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
    `;

    let countdownData: CountdownData | null = null;

    if (result.length > 0) {
      const campaign = result[0];
      countdownData = {
        id: campaign.id,
        name: campaign.name,
        text: campaign.countdown_text || '⚡ Oferta termina em:',
        endTime: campaign.countdown_end_time.toISOString(),
        isActive: campaign.is_active,
        priority: campaign.priority
      };
    }

    // Atualizar cache
    countdownCache = {
      data: countdownData,
      timestamp: Date.now()
    };

    console.log(`[SERVER] [INFO]${LOG_PREFIX} ✅ ${countdownData ? `Countdown ativo carregado: ${countdownData.name}` : 'Nenhum countdown ativo'}`);

    return json({
      success: true,
      data: countdownData
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutos
        'Vary': 'Accept-Encoding'
      }
    });

  } catch (error) {
    console.error(`[SERVER] [ERROR]${LOG_PREFIX} Erro ao buscar countdown:`, error);
    
    // Fallback data
    const fallbackCountdown: CountdownData = {
      id: 'fallback',
      name: 'Mega Promoção',
      text: '⚡ Mega promoção termina em:',
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      isActive: true,
      priority: 1
    };

    return json({
      success: false,
      error: 'Erro interno do servidor',
      data: fallbackCountdown, // Fallback para não quebrar o frontend
      fallback: true
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache menor para fallback
      }
    });
  }
}; 