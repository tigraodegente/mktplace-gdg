import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Buscar configurações
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    const category = url.searchParams.get('category') || 'all';
    
    let settings;
    if (category === 'all') {
      settings = await db.query`
        SELECT key, value, category, type, label, description
        FROM settings
        ORDER BY category, key
      `;
    } else {
      settings = await db.query`
        SELECT key, value, category, type, label, description
        FROM settings
        WHERE category = ${category}
        ORDER BY key
      `;
    }
    
    await db.close();
    
    // Agrupar por categoria
    const grouped = settings.reduce((acc: any, setting: any) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      
      let value = setting.value;
      // Converter tipos
      if (setting.type === 'boolean') {
        value = setting.value === 'true';
      } else if (setting.type === 'number') {
        value = Number(setting.value);
      } else if (setting.type === 'json') {
        try {
          value = JSON.parse(setting.value);
        } catch (e) {
          value = setting.value;
        }
      }
      
      acc[setting.category][setting.key] = {
        value,
        type: setting.type,
        label: setting.label,
        description: setting.description
      };
      
      return acc;
    }, {});
    
    return json({
      success: true,
      data: grouped
    });
    
  } catch (error) {
    console.error('Error fetching settings:', error);
    return json({
      success: false,
      error: 'Erro ao buscar configurações'
    }, { status: 500 });
  }
};

// PUT - Atualizar configurações
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.settings || typeof data.settings !== 'object') {
      return json({
        success: false,
        error: 'Configurações inválidas'
      }, { status: 400 });
    }
    
    const updates = [];
    for (const [key, value] of Object.entries(data.settings)) {
      let stringValue = String(value);
      
      // Se for objeto ou array, converter para JSON
      if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      }
      
      updates.push(
        db.query`
          INSERT INTO settings (key, value, updated_at)
          VALUES (${key}, ${stringValue}, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET value = ${stringValue}, updated_at = NOW()
        `
      );
    }
    
    await Promise.all(updates);
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Configurações atualizadas com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error updating settings:', error);
    return json({
      success: false,
      error: 'Erro ao atualizar configurações'
    }, { status: 500 });
  }
};

// POST - Criar nova configuração
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.key || !data.category) {
      return json({
        success: false,
        error: 'Chave e categoria são obrigatórias'
      }, { status: 400 });
    }
    
    // Verificar se já existe
    const [existing] = await db.query`
      SELECT key FROM settings WHERE key = ${data.key}
    `;
    
    if (existing) {
      await db.close();
      return json({
        success: false,
        error: 'Configuração já existe'
      }, { status: 400 });
    }
    
    let value = data.value || '';
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }
    
    // Inserir nova configuração
    await db.query`
      INSERT INTO settings (
        key, value, category, type, label, description, created_at, updated_at
      ) VALUES (
        ${data.key}, ${String(value)}, ${data.category},
        ${data.type || 'string'}, ${data.label || data.key},
        ${data.description || null}, NOW(), NOW()
      )
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Configuração criada com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error creating setting:', error);
    return json({
      success: false,
      error: 'Erro ao criar configuração'
    }, { status: 500 });
  }
}; 