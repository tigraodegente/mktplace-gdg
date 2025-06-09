#!/usr/bin/env node

/**
 * Script para criar a tabela de armazéns (warehouses)
 * Execute: node scripts/database/create-warehouses-table.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createWarehousesTable() {
    try {
        // Ler o SQL da tabela
        const sqlPath = join(__dirname, '../../schema/tables/warehouses.sql');
        const sql = readFileSync(sqlPath, 'utf-8');
        
        console.log('🏭 Criando tabela warehouses...');
        console.log('SQL:', sql);
        
        // Se você tiver um cliente de banco específico, pode executar aqui
        // Por enquanto, apenas mostramos o SQL
        
        console.log('✅ Script SQL preparado!');
        console.log('💡 Execute este SQL no seu banco de dados para criar a tabela warehouses.');
        
    } catch (error) {
        console.error('❌ Erro ao criar tabela warehouses:', error);
        process.exit(1);
    }
}

createWarehousesTable(); 