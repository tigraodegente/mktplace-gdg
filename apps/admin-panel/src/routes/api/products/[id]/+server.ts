import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { auditService } from '$lib/services/auditService';

/**
 * Normaliza um produto completo para comparação consistente
 * Garante que tanto o estado original quanto o final tenham o mesmo formato
 */
function normalizeProductForComparison(product: any): any {
  if (!product) return {};
  
  const normalized = { ...product };
  
  // 1. NORMALIZAÇÃO DE CAMPOS JSON
  // Garantir que objetos JSON sejam sempre objetos, nunca strings
  ['attributes', 'specifications'].forEach(field => {
    if (typeof normalized[field] === 'string') {
      try {
        normalized[field] = JSON.parse(normalized[field]);
      } catch {
        normalized[field] = {};
      }
    }
    if (!normalized[field] || typeof normalized[field] !== 'object' || Array.isArray(normalized[field])) {
      normalized[field] = {};
    }
  });
  
  // 2. NORMALIZAÇÃO DE CAMPOS DE PREÇO
  // Para preços opcionais: null, 0, "0", "" → null
  ['original_price', 'regular_price'].forEach(field => {
    const value = normalized[field];
    const numValue = parseFloat(String(value || '0')) || 0;
    normalized[field] = numValue > 0 ? numValue : null;
  });
  
  // Para preços obrigatórios: garantir que sejam números
  ['price', 'cost'].forEach(field => {
    normalized[field] = parseFloat(String(normalized[field] || '0')) || 0;
  });
  
  // 3. NORMALIZAÇÃO DE ARRAYS
  ['tags', 'meta_keywords', 'images', 'videos'].forEach(field => {
    if (!Array.isArray(normalized[field])) {
      normalized[field] = [];
    }
  });
  
  // 4. NORMALIZAÇÃO DE CAMPOS NUMÉRICOS
  ['quantity', 'weight', 'height', 'width', 'length', 'low_stock_alert'].forEach(field => {
    const value = normalized[field];
    normalized[field] = value !== null && value !== undefined && value !== '' 
      ? (parseFloat(String(value)) || 0) 
      : null;
  });
  
  // 5. NORMALIZAÇÃO DE CAMPOS BOOLEANOS
  ['is_active', 'featured', 'track_inventory', 'allow_backorder', 'has_free_shipping', 
   'requires_shipping', 'is_digital', 'allow_reviews', 'age_restricted', 'is_customizable'].forEach(field => {
    normalized[field] = Boolean(normalized[field]);
  });
  
  // 6. NORMALIZAÇÃO DE STRINGS
  ['name', 'sku', 'description', 'short_description', 'slug', 'model', 'barcode',
   'condition', 'status', 'ncm_code', 'gtin', 'origin', 'care_instructions', 'manual_link'].forEach(field => {
    normalized[field] = normalized[field] ? String(normalized[field]).trim() : null;
  });
  
  // 7. REMOVER CAMPOS TEMPORÁRIOS E CALCULADOS
  const fieldsToRemove = [
    'created_at', 'updated_at', 'category_name', 'brand_name', 'seller_name',
    'cost_price', 'sale_price', 'regular_price', 'tags_input', 'meta_keywords_input',
    '_selected_categories', '_related_categories', 'custom_fields', 'has_variants',
    'categories', 'category_ids', 'related_products', 'upsell_products', 'download_files',
    'product_options', 'product_variants', 'variant_type', 'related_product_ids', 'upsell_product_ids'
  ];
  
  fieldsToRemove.forEach(field => {
    delete normalized[field];
  });
  
  return normalized;
}

/**
 * Compara dois produtos normalizados e registra histórico das alterações
 */
async function compareAndLogHistory(
  originalProduct: any, 
  finalProduct: any, 
  productId: string, 
  db: any,
  user?: any
): Promise<{ totalChanges: number; summary: string }> {
  
  console.log('🔄 Normalizando produtos para comparação...');
  
  // NORMALIZAR AMBOS OS PRODUTOS NO MESMO FORMATO
  const normalizedOriginal = normalizeProductForComparison(originalProduct);
  const normalizedFinal = normalizeProductForComparison(finalProduct);
  
  console.log('📊 Produtos normalizados:', {
    original_fields: Object.keys(normalizedOriginal).length,
    final_fields: Object.keys(normalizedFinal).length,
    sample_original: {
      original_price: normalizedOriginal.original_price,
      attributes: normalizedOriginal.attributes,
      specifications: normalizedOriginal.specifications
    },
    sample_final: {
      original_price: normalizedFinal.original_price,
      attributes: normalizedFinal.attributes,
      specifications: normalizedFinal.specifications
    }
  });
  
  const changes: Record<string, { old: any; new: any; label: string }> = {};
  
  // Mapeamento de campos para nomes amigáveis
  const fieldLabels: Record<string, string> = {
    name: 'Nome',
    sku: 'SKU',
    price: 'Preço',
    original_price: 'Preço Original',
    cost: 'Custo',
    quantity: 'Quantidade em Estoque',
    description: 'Descrição',
    short_description: 'Descrição Curta',
    weight: 'Peso',
    height: 'Altura',
    width: 'Largura',
    length: 'Comprimento',
    category_id: 'Categoria',
    brand_id: 'Marca',
    seller_id: 'Vendedor',
    is_active: 'Status Ativo',
    featured: 'Em Destaque',
    status: 'Status',
    condition: 'Condição',
    tags: 'Tags',
    meta_title: 'Título SEO',
    meta_description: 'Descrição SEO',
    meta_keywords: 'Palavras-chave SEO',
    attributes: 'Atributos para Filtros',
    specifications: 'Especificações Técnicas',
    track_inventory: 'Controlar Estoque',
    allow_backorder: 'Permitir Pré-venda',
    low_stock_alert: 'Alerta de Estoque Baixo',
    has_free_shipping: 'Frete Grátis',
    requires_shipping: 'Requer Frete',
    is_digital: 'Produto Digital',
    published_at: 'Data de Publicação',
    age_restricted: 'Restrito por Idade',
    videos: 'Vídeos do Produto',
    manual_link: 'Link do Manual',
    ncm_code: 'Código NCM',
    gtin: 'Código GTIN',
    origin: 'Origem do Produto',
    allow_reviews: 'Permitir Avaliações',
    is_customizable: 'Produto Customizável',
    care_instructions: 'Instruções de Cuidado',
    manufacturing_country: 'País de Fabricação',
    warranty_period: 'Período de Garantia',
    tax_class: 'Classe Tributária'
  };
  
  // Combinar todas as chaves de ambos os objetos normalizados
  const allKeys = new Set([
    ...Object.keys(normalizedOriginal),
    ...Object.keys(normalizedFinal)
  ]);
  
  for (const key of allKeys) {
    const oldValue = normalizedOriginal[key];
    const newValue = normalizedFinal[key];
    
    // Comparação simples e direta (ambos já normalizados)
    if (!deepEqual(oldValue, newValue)) {
      const label = fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      changes[key] = {
        old: oldValue,
        new: newValue,
        label
      };
      
      console.log(`🔍 Alteração detectada em "${key}": "${oldValue}" → "${newValue}"`);
    }
  }
  
  const totalChanges = Object.keys(changes).length;
  
  if (totalChanges > 0) {
    console.log(`✅ ${totalChanges} alteração(ões) real(is) detectada(s)`);
  } else {
    console.log('✅ NENHUMA ALTERAÇÃO DETECTADA - produtos são idênticos após normalização');
  }
  
  const summary = generateSmartSummary(changes, totalChanges);
  
  // Registrar no banco apenas se há alterações reais
  if (totalChanges > 0) {
    try {
      await db.query(`
        INSERT INTO product_history (
          product_id, user_id, user_name, user_email, action, changes, summary, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW()
        )
      `, [
        productId,
        user?.id || null,
        user?.name || 'Usuário Desconhecido',
        user?.email || 'unknown@system.com',
        'updated',
        JSON.stringify(changes),
        summary
      ]);
      
      console.log(`📝 Histórico salvo: ${summary}`);
    } catch (dbError) {
      console.error('❌ Erro ao salvar histórico:', dbError);
    }
  }
  
  return { totalChanges, summary };
}

/**
 * Comparação profunda de valores normalizados
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  // Tratar casos especiais de null/undefined
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      keysB.includes(key) && deepEqual(a[key], b[key])
    );
  }
  
  return a === b;
}

/**
 * Gera resumo inteligente das alterações
 */
function generateSmartSummary(changes: Record<string, any>, totalChanges: number): string {
  if (totalChanges === 0) {
    return 'Nenhuma alteração detectada';
  }
  
  if (totalChanges === 1) {
    const change = Object.values(changes)[0];
    return `${change.label} alterado`;
  }
  
  if (totalChanges === 2) {
    const changesList = Object.values(changes);
    return `${changesList[0].label} e ${changesList[1].label} alterados`;
  }
  
  if (totalChanges === 3) {
    const changesList = Object.values(changes);
    return `${changesList[0].label}, ${changesList[1].label} e ${changesList[2].label} alterados`;
  }
  
  // Para 4+ alterações, priorizar campos importantes
  const priorityFields = ['name', 'price', 'sku', 'quantity', 'is_active'];
  const allChanges = Object.entries(changes);
  const priorityChanges = allChanges.filter(([field]) => priorityFields.includes(field));
  
  if (priorityChanges.length > 0) {
    const priorityLabels = priorityChanges.map(([_, change]) => change.label);
    
    if (priorityChanges.length === 1 && totalChanges <= 4) {
      const otherChanges = allChanges.filter(([field]) => !priorityFields.includes(field));
      const otherLabels = otherChanges.slice(0, 2).map(([_, change]) => change.label);
      
      if (otherLabels.length === 1) {
        return `${priorityLabels[0]} e ${otherLabels[0]} alterados`;
      } else if (otherLabels.length === 2) {
        return `${priorityLabels[0]}, ${otherLabels[0]} e ${otherLabels[1]} alterados`;
      }
    }
    
    if (priorityChanges.length >= 2) {
      return `${priorityLabels[0]}, ${priorityLabels[1]} e outros ${totalChanges - 2} campos alterados`;
    }
    
    return `${priorityLabels[0]} e outros ${totalChanges - 1} campos alterados`;
  }
  
  // Se não há campos prioritários
  const firstChanges = allChanges.slice(0, 3).map(([_, change]) => change.label);
  if (totalChanges <= 3) {
    return firstChanges.join(', ') + ' alterados';
  }
  
  return `${firstChanges[0]}, ${firstChanges[1]} e outros ${totalChanges - 2} campos alterados`;
}

// Função para converter nomes de países para códigos ISO
function getCountryCode(countryName: string | null): string | null {
  if (!countryName) return null;
  
  const countryMap: Record<string, string> = {
    'brasil': 'BR',
    'brazil': 'BR',
    'estados unidos': 'US',
    'united states': 'US',
    'china': 'CN',
    'alemanha': 'DE',
    'germany': 'DE',
    'japão': 'JP',
    'japan': 'JP',
    'coreia do sul': 'KR',
    'south korea': 'KR',
    'itália': 'IT',
    'italy': 'IT',
    'frança': 'FR',
    'france': 'FR',
    'reino unido': 'GB',
    'united kingdom': 'GB',
    'canadá': 'CA',
    'canada': 'CA',
    'méxico': 'MX',
    'mexico': 'MX',
    'argentina': 'AR',
    'chile': 'CL',
    'uruguai': 'UY',
    'paraguai': 'PY',
    'venezuela': 'VE',
    'colômbia': 'CO',
    'peru': 'PE',
    'equador': 'EC',
    'bolívia': 'BO'
  };
  
  const normalized = countryName.toLowerCase().trim();
  return countryMap[normalized] || (countryName.length === 2 ? countryName.toUpperCase() : 'BR');
}

// Função para decodificar JWT (implementação simples para desenvolvimento)
function decodeJWT(token: string): any {
  try {
    // JWT tem 3 partes separadas por pontos: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token JWT inválido');
    }
    
    // Decodificar o payload (segunda parte)
    const payload = parts[1];
    
    // Adicionar padding se necessário para base64
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decodificar base64
    const decodedPayload = atob(paddedPayload);
    
    // Parsear JSON
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('❌ Erro ao decodificar JWT:', error);
    return null;
  }
}

// GET - Buscar produto por ID
export const GET: RequestHandler = async ({ params }) => {
  try {
    console.log('🔌 Dev: NEON - Buscando produto por ID');
    const db = getDatabase();
    const { id } = params;
    
    const query = `
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN product_categories pc ON pc.product_id = p.id AND pc.is_primary = true
      LEFT JOIN categories c ON c.id = pc.category_id
      WHERE p.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (!result[0]) {
      return json({ 
        success: false, 
        error: 'Produto não encontrado' 
      }, { status: 404 });
    }

    const product = result[0];
    
    console.log(`✅ Produto ${id} encontrado e carregado`);
    return json({ 
      success: true, 
      data: product 
    });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return json({ 
      success: false, 
      error: 'Erro ao buscar produto' 
    }, { status: 500 });
  }
};

// Função para comparar e registrar histórico (versão corrigida)
async function logProductHistory(originalProduct: any, updatedProduct: any, productId: string, db: any, user?: any) {
  try {
    console.log('📊 Registrando histórico do produto...');
    
    const changes: Record<string, { old: any; new: any; label: string }> = {};
    
    // Mapeamento de campos para nomes amigáveis
    const fieldLabels: Record<string, string> = {
      name: 'Nome',
      sku: 'SKU',
      price: 'Preço',
      original_price: 'Preço Original',
      cost: 'Custo',
      quantity: 'Quantidade em Estoque',
      description: 'Descrição',
      is_active: 'Status Ativo',
      featured: 'Em Destaque',
      status: 'Status'
    };
    
    // Comparar campos principais
    const fieldsToCheck = ['name', 'sku', 'price', 'original_price', 'cost', 'quantity', 'description', 'is_active', 'featured', 'status'];
    
    for (const field of fieldsToCheck) {
      let oldValue = originalProduct[field];
      let newValue = updatedProduct[field];
      
      // 🔧 NORMALIZAR TIPOS PARA COMPARAÇÃO
      if (field === 'price' || field === 'original_price' || field === 'cost') {
        // Para campos de preço, converter para number para comparar
        oldValue = oldValue ? parseFloat(oldValue) : null;
        newValue = newValue ? parseFloat(newValue) : null;
      } else if (field === 'quantity') {
        // Para quantidade, converter para number
        oldValue = oldValue ? parseInt(oldValue) : 0;
        newValue = newValue ? parseInt(newValue) : 0;
      } else if (field === 'is_active' || field === 'featured') {
        // Para booleanos, garantir tipo boolean
        oldValue = Boolean(oldValue);
        newValue = Boolean(newValue);
      }
      
      console.log(`🔍 Comparando ${field}: "${oldValue}" (${typeof oldValue}) vs "${newValue}" (${typeof newValue})`);
      
      if (oldValue !== newValue) {
        const label = fieldLabels[field] || field;
        changes[field] = {
          old: originalProduct[field], // Manter valor original para histórico
          new: updatedProduct[field],  // Manter valor atualizado para histórico
          label
        };
        console.log(`🔍 Alteração detectada em "${field}": "${originalProduct[field]}" → "${updatedProduct[field]}"`);
      }
    }
    
    const totalChanges = Object.keys(changes).length;
    
    // Gerar resumo das alterações (SEMPRE, mesmo se totalChanges = 0)
    let summary = '';
    if (totalChanges === 1) {
      const change = Object.values(changes)[0];
      summary = `${change.label} alterado`;
    } else if (totalChanges === 2) {
      const changesList = Object.values(changes);
      summary = `${changesList[0].label} e ${changesList[1].label} alterados`;
    } else if (totalChanges > 2) {
      const firstChange = Object.values(changes)[0];
      summary = `${firstChange.label} e outros ${totalChanges - 1} campos alterados`;
    } else {
      summary = 'Nenhuma alteração detectada';
    }
    
    if (totalChanges > 0) {
      // 🔧 INSERÇÃO CORRIGIDA com informações do usuário logado
      console.log(`📝 Tentando salvar histórico: ${summary}`);
      console.log(`📝 Product ID: ${productId} (type: ${typeof productId})`);
      console.log(`📝 Changes: ${JSON.stringify(changes)}`);
      console.log(`👤 Usuário: ${user?.name || 'Usuário Desconhecido'} (${user?.email || 'unknown@system.com'})`);
      
      const result = await db.query(`
        INSERT INTO product_history (
          product_id, action, changes, summary, user_name, user_email
        ) VALUES (
          $1::uuid, $2, $3::jsonb, $4, $5, $6
        ) RETURNING id
      `, [
        productId,
        'updated',
        JSON.stringify(changes),
        summary,
        user?.name || 'Usuário Desconhecido',
        user?.email || 'unknown@system.com'
      ]);
      
      console.log(`📝 Histórico salvo com ID: ${result[0].id} - ${summary}`);
    } else {
      console.log('✅ Nenhuma alteração detectada - não há necessidade de histórico');
    }
    
    return { totalChanges, summary };
  } catch (error) {
    console.error('❌ Erro ao registrar histórico:', error);
    console.error('❌ Detalhes do erro:', error instanceof Error ? error.message : error);
    // Não falhar a operação por causa do histórico
    return { totalChanges: 0, summary: `Erro ao registrar histórico: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
}

// PUT - Atualizar produto
export const PUT: RequestHandler = async ({ params, request, platform }: any) => {
  const { id } = params;
  
  if (!id) {
    return json({ 
      success: false, 
      error: 'ID é obrigatório',
      message: 'ID é obrigatório' 
    }, { status: 400 });
  }

  try {
    const requestData = await request.json();
    const db = getDatabase(platform);
    
    // 👤 EXTRAIR USUÁRIO DO TOKEN JWT
    let currentUser = null;
    const authHeader = request.headers.get('authorization');
    
    console.log('🔐 Header de autorização:', authHeader ? 'Presente' : 'Ausente');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🎫 Token extraído:', token.substring(0, 20) + '...');
      
      const payload = decodeJWT(token);
      console.log('📦 Payload decodificado:', payload);
      
      if (payload && payload.userId) {
        // Buscar nome do usuário no banco usando o userId
        try {
          const userResult = await db.query('SELECT name, email FROM users WHERE id = $1', [payload.userId]);
          const userData = userResult[0];
          
          currentUser = {
            id: payload.userId,
            name: userData?.name || payload.email?.split('@')[0] || 'Usuário',
            email: payload.email || userData?.email || 'unknown@system.com'
          };
          console.log('👤 Usuário extraído do token e banco:', currentUser);
        } catch (dbError) {
          console.error('❌ Erro ao buscar usuário no banco:', dbError);
          // Fallback usando apenas dados do token
          currentUser = {
            id: payload.userId,
            name: payload.email?.split('@')[0] || 'Usuário',
            email: payload.email || 'unknown@system.com'
          };
        }
      }
    }
    
    // ⚠️ FALLBACK TEMPORÁRIO - deve ser removido em produção
    if (!currentUser) {
      console.log('⚠️ Token não encontrado ou inválido, usando usuário padrão');
      currentUser = { 
        name: 'Usuário Desconhecido', 
        email: 'unknown@marketplace.com', 
        id: 'fallback-user-id' 
      };
    }
    
    console.log(`🔄 Usuário ${currentUser?.name} atualizando produto ${id}`);
    
    // Buscar produto original para auditoria
    const originalResult = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (!originalResult[0]) {
      await db.close();
      return json({ 
        success: false, 
        error: 'Produto não encontrado',
        message: 'Produto não encontrado' 
      }, { status: 404 });
    }
    
    const originalProduct = originalResult[0];
    console.log('📋 Estado original capturado para auditoria');
    
    // Atualizar produto
    const result = await db.query(`
      UPDATE products SET
        name = $1,
        slug = $2,
        sku = $3,
        description = $4,
        price = $5,
        original_price = $6,
        cost = $7,
        quantity = $8,
        is_active = $9,
        featured = $10,
        status = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      requestData.name,
      requestData.slug || requestData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      requestData.sku,
      requestData.description || '',
      requestData.price,
      requestData.original_price || null,
      requestData.cost || 0,
      requestData.quantity || 0,
      requestData.is_active !== false,
      requestData.featured || false,
      requestData.status || 'active',
      id
    ]);
    
    if (!result[0]) {
      await db.close();
      return json({ 
        success: false, 
        error: 'Produto não encontrado',
        message: 'Produto não encontrado' 
      }, { status: 404 });
    }
    
    const updatedProduct = result[0];
    
    // 📝 REGISTRAR HISTÓRICO USANDO A FUNÇÃO ESPECÍFICA
    await logProductHistory(originalProduct, updatedProduct, id, db, currentUser);
    
    // 📊 REGISTRAR NO SISTEMA DE AUDITORIA UNIVERSAL
    try {
      await auditService.logAudit(
        'products',
        id,
        'update',
        {
          changes: auditService.calculateChanges(originalProduct, updatedProduct),
          old_values: originalProduct,
          new_values: updatedProduct,
          context: {
            user_id: currentUser?.id,
            user_name: currentUser?.name,
            user_email: currentUser?.email,
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            source: 'admin_panel'
          },
          headers: request.headers,
          platform
        }
      );
      console.log(`🎯 Auditoria universal registrada`);
    } catch (auditError) {
      console.error('❌ Erro na auditoria universal:', auditError);
    }
    
    await db.close();
    
    console.log(`✅ Produto ${id} atualizado com sucesso por ${currentUser?.name}`);
    
    return json({ 
      success: true, 
      data: updatedProduct,
      message: 'Produto atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);
    return json({ 
      success: false, 
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar produto'
    }, { status: 500 });
  }
};

// DELETE - Excluir produto por ID (sem middleware JWT)
export const DELETE: RequestHandler = async ({ params, url }) => {
  try {
    console.log('🔌 Dev: NEON - Excluindo produto');
    const db = getDatabase();
    const { id } = params;
    
    // Verificar se é hard delete (query parameter ?force=true)
    const forceDelete = url.searchParams.get('force') === 'true';
    
    if (forceDelete) {
      console.log(`🗑️ Hard delete solicitado para produto: ${id}`);
      
      // Remover produto definitivamente
      const result = await db.query(`
        DELETE FROM products 
        WHERE id = $1
        RETURNING name, sku
      `, [id]);
      
      if (result[0]) {
        console.log(`✅ Produto removido definitivamente: ${result[0].name} (${result[0].sku})`);
        return json({
          success: true,
          message: `Produto "${result[0].name}" removido definitivamente do banco de dados!`
        });
      } else {
        return json({ 
          success: false, 
          error: 'Produto não encontrado' 
        }, { status: 404 });
      }
    } else {
      // Soft delete padrão - apenas marcar como arquivado
      const result = await db.query(`
        UPDATE products 
        SET is_active = false, status = 'archived', updated_at = NOW()
        WHERE id = $1
        RETURNING name, sku
      `, [id]);
      
      if (result[0]) {
        console.log(`📦 Produto arquivado: ${result[0].name} (${result[0].sku})`);
        return json({
          success: true,
          message: `Produto "${result[0].name}" arquivado com sucesso!`
        });
      } else {
        return json({ 
          success: false, 
          error: 'Produto não encontrado' 
        }, { status: 404 });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao excluir produto:', error);
    return json({
      success: false,
      error: 'Erro ao excluir produto'
    }, { status: 500 });
  }
}; 