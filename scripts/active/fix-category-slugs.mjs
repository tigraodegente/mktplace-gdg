#!/usr/bin/env node

import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Função slugify correta (mesma do utils)
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/--+/g, '-') // Remove hífens duplicados
    .replace(/^-+/, '') // Remove hífens do início
    .replace(/-+$/, ''); // Remove hífens do fim
}

// Função para gerar slug único
function generateUniqueSlug(baseSlug, usedSlugs) {
  let uniqueSlug = baseSlug;
  let counter = 1;
  
  while (usedSlugs.has(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  usedSlugs.add(uniqueSlug);
  return uniqueSlug;
}

async function main() {
  console.log('🔧 Iniciando correção dos slugs das categorias...');

  // Carregar variáveis de ambiente
  const envPath = join(__dirname, '../../.env.local');
  try {
    const envFile = readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key] = value.replace(/^["']|["']$/g, '');
      }
    });
  } catch (err) {
    console.warn('⚠️ Arquivo .env.local não encontrado, usando variáveis do sistema');
  }

  // Usar postgres igual ao projeto
  const postgres = (await import('postgres')).default;
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: process.env.DATABASE_URL.includes('neon.tech') ? 'require' : false,
    max: 1,
    prepare: false,
    transform: {
      undefined: null
    }
  });

  try {
    // 1. Buscar todas as categorias
    console.log('📋 Buscando categorias...');
    const categories = await sql`
      SELECT id, name, slug 
      FROM categories 
      ORDER BY name
    `;

    console.log(`📊 Encontradas ${categories.length} categorias`);

    let updated = 0;
    const updates = [];
    const usedSlugs = new Set();
    
    // Primeiro, adicionar slugs corretos já existentes
    for (const category of categories) {
      const correctSlug = slugify(category.name);
      if (category.slug === correctSlug) {
        usedSlugs.add(correctSlug);
      }
    }

    // Processar categorias que precisam de correção
    for (const category of categories) {
      const baseSlug = slugify(category.name);
      
      if (category.slug !== baseSlug) {
        // Gerar slug único
        const uniqueSlug = generateUniqueSlug(baseSlug, usedSlugs);
        
        console.log(`🔄 "${category.name}": "${category.slug}" → "${uniqueSlug}"`);
        updates.push({
          id: category.id,
          name: category.name,
          oldSlug: category.slug,
          newSlug: uniqueSlug
        });
      }
    }

    if (updates.length === 0) {
      console.log('✅ Todos os slugs já estão corretos!');
      return;
    }

    console.log(`\n🔄 ${updates.length} slugs precisam ser corrigidos:`);
    updates.forEach(u => console.log(`  - "${u.name}": ${u.oldSlug} → ${u.newSlug}`));

    // 2. Aplicar as correções automaticamente
    console.log('\n✅ Aplicando correções...');

    // 3. Aplicar as correções
    for (const update of updates) {
      await sql`
        UPDATE categories 
        SET slug = ${update.newSlug}
        WHERE id = ${update.id}
      `;
      updated++;
      console.log(`✅ Corrigido: ${update.name}`);
    }

    console.log(`\n🎉 Correção concluída! ${updated} slugs foram atualizados.`);

    // 4. Verificar se há conflitos de slug
    console.log('\n🔍 Verificando conflitos de slug...');
    const duplicates = await sql`
      SELECT slug, COUNT(*) as count
      FROM categories
      GROUP BY slug
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length > 0) {
      console.log('⚠️ Slugs duplicados encontrados:');
      duplicates.forEach(d => console.log(`  - "${d.slug}": ${d.count} categorias`));
    } else {
      console.log('✅ Nenhum slug duplicado encontrado');
    }

    console.log('\n🚀 Script concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main().catch(console.error); 