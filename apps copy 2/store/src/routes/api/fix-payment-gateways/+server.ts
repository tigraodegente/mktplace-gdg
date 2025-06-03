import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Criar tabela payment_gateways
    await db.execute`
      CREATE TABLE IF NOT EXISTS payment_gateways (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        api_key TEXT,
        secret_key TEXT,
        environment VARCHAR(20) DEFAULT 'sandbox',
        webhook_secret TEXT,
        is_active BOOLEAN DEFAULT false,
        is_sandbox BOOLEAN DEFAULT true,
        supported_methods JSONB DEFAULT '[]',
        min_amount DECIMAL(10,2),
        max_amount DECIMAL(10,2),
        priority INTEGER DEFAULT 0,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    // Inserir gateway padrão
    await db.execute`
      INSERT INTO payment_gateways (
        name,
        display_name,
        is_active,
        supported_methods,
        priority
      ) VALUES (
        'default',
        'Gateway Padrão',
        true,
        '["credit_card", "debit_card", "pix", "boleto"]'::jsonb,
        1
      ) ON CONFLICT (name) DO UPDATE SET
        updated_at = NOW()
    `;
    
    // Inserir AppMax (desativada por padrão)
    await db.execute`
      INSERT INTO payment_gateways (
        name,
        display_name,
        environment,
        is_active,
        is_sandbox,
        supported_methods,
        min_amount,
        max_amount,
        priority,
        config
      ) VALUES (
        'appmax',
        'AppMax',
        'sandbox',
        false,
        true,
        '["credit_card", "debit_card", "pix", "boleto"]'::jsonb,
        1.00,
        99999.00,
        100,
        '{
          "pixExpirationMinutes": 60,
          "boletoExpirationDays": 3,
          "webhookEvents": ["payment.approved", "payment.declined", "payment.refunded", "payment.cancelled"]
        }'::jsonb
      ) ON CONFLICT (name) DO UPDATE SET
        updated_at = NOW()
    `;
    
    return json({
      success: true,
      message: 'Tabela payment_gateways criada com sucesso!'
    });
    
  } catch (error) {
    console.error('Erro ao criar tabela:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}; 