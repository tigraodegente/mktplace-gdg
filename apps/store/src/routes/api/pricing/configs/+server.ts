import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getDatabase } from '$lib/db';

// Cache simples em memória (5 minutos)
let configsCache: Record<string, any> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Configurações padrão como fallback
const DEFAULT_CONFIGS: Record<string, any> = {
	pix_discount_percent: 5,
	pix_enabled: true,
	installments_default: 12,
	installments_max: 24,
	installments_min_value: 20,
	installments_interest_free_up_to: 2,
	installments_interest_rate_monthly: 2.99,
	boleto_discount_percent: 3,
	debit_discount_percent: 2,
	free_shipping_threshold: 199,
	express_shipping_fee: 15,
	processing_fee_percent: 3.79,
	convenience_fee_boleto: 3
};

export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		// Verificar cache
		const now = Date.now();
		if (configsCache && (now - cacheTimestamp) < CACHE_TTL) {
			return json({
				success: true,
				data: configsCache,
				cached: true,
				timestamp: cacheTimestamp
			});
		}

		// Buscar do banco de dados
		const db = getDatabase(platform);
		
		// Parâmetros opcionais para scoping
		const categoryId = url.searchParams.get('category_id');
		const sellerId = url.searchParams.get('seller_id');
		const userSegment = url.searchParams.get('user_segment');

		// Query simplificada para pegar apenas configurações globais por enquanto
		const results = await db.query(`
			SELECT config_key, config_value
			FROM pricing_configs
			WHERE 
				is_active = true
				AND (valid_from IS NULL OR valid_from <= NOW())
				AND (valid_until IS NULL OR valid_until > NOW())
				AND category_id IS NULL 
				AND seller_id IS NULL 
				AND user_segment IS NULL
			ORDER BY config_key;
		`);
		
		// Processar resultados em objeto
		const configs = { ...DEFAULT_CONFIGS };
		for (const row of results) {
			try {
				// Converter JSONB para o tipo correto
				const value = typeof row.config_value === 'string' 
					? JSON.parse(row.config_value)
					: row.config_value;
				configs[row.config_key] = value;
			} catch (e) {
				console.warn(`Erro ao processar config ${row.config_key}:`, e);
				// Manter valor padrão
			}
		}

		// Atualizar cache
		configsCache = configs;
		cacheTimestamp = now;

		return json({
			success: true,
			data: configs,
			cached: false,
			timestamp: now,
			total_configs: Object.keys(configs).length
		});

	} catch (error) {
		console.error('Erro ao buscar configurações de pricing:', error);
		
		// Retornar configurações padrão em caso de erro
		return json({
			success: true,
			data: DEFAULT_CONFIGS,
			cached: false,
			fallback: true,
			error: 'Usando configurações padrão devido a erro no banco',
			timestamp: Date.now()
		});
	}
};

// POST apenas para admin (será implementado no admin-panel)
export const POST: RequestHandler = async () => {
	return json({
		success: false,
		error: 'Endpoint disponível apenas no admin-panel'
	}, { status: 403 });
}; 