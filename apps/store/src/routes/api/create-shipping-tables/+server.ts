import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      // 1. Criar tabela shipping_carriers
      await db.query`
        CREATE TABLE IF NOT EXISTS shipping_carriers (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          api_endpoint VARCHAR(500),
          api_credentials JSONB,
          is_active BOOLEAN DEFAULT true,
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // 2. Criar tabela shipping_zones
      await db.query`
        CREATE TABLE IF NOT EXISTS shipping_zones (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          carrier_id TEXT REFERENCES shipping_carriers(id),
          name VARCHAR(255) NOT NULL,
          uf VARCHAR(2),
          cities TEXT[],
          postal_code_ranges JSONB,
          zone_type VARCHAR(50),
          delivery_days_min INTEGER,
          delivery_days_max INTEGER,
          restrictions JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // 3. Criar tabela shipping_rates
      await db.query`
        CREATE TABLE IF NOT EXISTS shipping_rates (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          zone_id TEXT REFERENCES shipping_zones(id),
          weight_rules JSONB DEFAULT '[]',
          dimension_rules JSONB DEFAULT '[]',
          base_price DECIMAL(10,2) DEFAULT 0,
          price_per_kg DECIMAL(10,2) DEFAULT 0,
          price_per_km DECIMAL(10,2) DEFAULT 0,
          additional_fees JSONB DEFAULT '{}',
          conditions JSONB DEFAULT '{}',
          valid_from DATE DEFAULT CURRENT_DATE,
          valid_to DATE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // 4. Criar tabela seller_shipping_configs
      await db.query`
        CREATE TABLE IF NOT EXISTS seller_shipping_configs (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          seller_id TEXT,
          carrier_id TEXT REFERENCES shipping_carriers(id),
          zone_id TEXT REFERENCES shipping_zones(id),
          is_enabled BOOLEAN DEFAULT true,
          markup_percentage DECIMAL(5,2) DEFAULT 0,
          free_shipping_threshold DECIMAL(10,2),
          free_shipping_products TEXT[],
          free_shipping_categories TEXT[],
          max_weight_kg DECIMAL(8,2),
          max_dimensions JSONB,
          product_exceptions JSONB DEFAULT '{}',
          category_exceptions JSONB DEFAULT '{}',
          priority INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // 5. Criar índices
      await db.query`
        CREATE INDEX IF NOT EXISTS idx_shipping_zones_carrier ON shipping_zones(carrier_id);
        CREATE INDEX IF NOT EXISTS idx_shipping_zones_uf ON shipping_zones(uf);
        CREATE INDEX IF NOT EXISTS idx_shipping_rates_zone ON shipping_rates(zone_id);
      `;

      // 6. Inserir dados iniciais
      await db.query`
        INSERT INTO shipping_carriers (id, name, type) VALUES 
        ('frenet-carrier', 'Frenet', 'table'),
        ('correios-carrier', 'Correios', 'table')
        ON CONFLICT (id) DO NOTHING
      `;

      // 7. Criar algumas zonas de exemplo
      await db.query`
        INSERT INTO shipping_zones (id, carrier_id, name, uf, postal_code_ranges, delivery_days_min, delivery_days_max) VALUES 
        ('sp-capital', 'frenet-carrier', 'São Paulo Capital', 'SP', '[{"from": "01000000", "to": "01999999"}]', 1, 3),
        ('sp-interior', 'frenet-carrier', 'São Paulo Interior', 'SP', '[{"from": "02000000", "to": "19999999"}]', 2, 5),
        ('rj-capital', 'frenet-carrier', 'Rio de Janeiro Capital', 'RJ', '[{"from": "20000000", "to": "28999999"}]', 2, 4),
        ('mg-capital', 'frenet-carrier', 'Belo Horizonte', 'MG', '[{"from": "30000000", "to": "39999999"}]', 3, 6),
        ('am-capital', 'frenet-carrier', 'Manaus', 'AM', '[{"from": "69000000", "to": "69999999"}]', 5, 12),
        ('df-capital', 'frenet-carrier', 'Brasília', 'DF', '[{"from": "70000000", "to": "72799999"}]', 2, 5)
        ON CONFLICT (id) DO NOTHING
      `;

      // 8. Criar rates com preços diferentes por zona
      await db.query`
        INSERT INTO shipping_rates (zone_id, weight_rules, base_price, additional_fees) VALUES 
        ('sp-capital', '[{"from": 0, "to": 500, "price": 8.50}, {"from": 501, "to": 2000, "price": 15.90}]', 8.50, '{"gris": 0.30}'),
        ('sp-interior', '[{"from": 0, "to": 500, "price": 12.90}, {"from": 501, "to": 2000, "price": 22.40}]', 12.90, '{"gris": 0.30}'),
        ('rj-capital', '[{"from": 0, "to": 500, "price": 11.80}, {"from": 501, "to": 2000, "price": 19.50}]', 11.80, '{"gris": 0.30}'),
        ('mg-capital', '[{"from": 0, "to": 500, "price": 14.20}, {"from": 501, "to": 2000, "price": 25.80}]', 14.20, '{"gris": 0.30}'),
        ('am-capital', '[{"from": 0, "to": 500, "price": 28.90}, {"from": 501, "to": 2000, "price": 45.60}]', 28.90, '{"gris": 0.30}'),
        ('df-capital', '[{"from": 0, "to": 500, "price": 16.50}, {"from": 501, "to": 2000, "price": 29.90}]', 16.50, '{"gris": 0.30}')
        ON CONFLICT DO NOTHING
      `;

      return {
        success: true,
        message: 'Tabelas de shipping criadas com sucesso!',
        tables_created: ['shipping_carriers', 'shipping_zones', 'shipping_rates', 'seller_shipping_configs'],
        zones_created: 6,
        sample_data: 'Dados de exemplo inseridos para SP, RJ, MG, AM, DF'
      };
    });

    return json(result);

  } catch (error) {
    console.error('Erro ao criar tabelas de shipping:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 