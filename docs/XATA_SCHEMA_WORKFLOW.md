# Fluxo de Trabalho com Schema no Xata - Guia Completo

## 🎯 Problema Identificado

O Xata tem um fluxo específico para gerenciamento de schema que difere de ORMs tradicionais:

1. **A ORM do Xata é apenas para manipulação de dados**, não para criação/alteração de schema
2. **O schema deve ser criado primeiro** no Xata Cloud (via painel ou API REST)
3. **O cliente TypeScript é gerado** a partir do schema existente no Xata Cloud
4. **Não é possível criar tabelas/colunas** diretamente pela ORM

## 📋 Fluxo Correto de Trabalho

### 1. Criação do Schema

#### Opção A: Via Painel Web do Xata (Recomendado para início)
1. Acesse [app.xata.io](https://app.xata.io)
2. Crie as tabelas manualmente
3. Defina campos e relacionamentos
4. O Xata criará automaticamente os campos especiais (`xata_id`, `xata_version`, etc.)

#### Opção B: Via API REST do Xata (Recomendado para automação)
```bash
# Criar uma tabela
curl -X POST https://api.xata.io/db/{workspace}/{database}/tables \
  -H "Authorization: Bearer $XATA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "brands",
    "columns": [
      {"name": "id", "type": "string", "unique": true, "notNull": true},
      {"name": "name", "type": "string", "notNull": true},
      {"name": "slug", "type": "string", "unique": true, "notNull": true},
      {"name": "description", "type": "text"},
      {"name": "logo_url", "type": "string"},
      {"name": "website", "type": "string"},
      {"name": "is_active", "type": "bool", "defaultValue": true},
      {"name": "created_at", "type": "datetime", "defaultValue": "now()"},
      {"name": "updated_at", "type": "datetime", "defaultValue": "now()"}
    ]
  }'
```

#### Opção C: Via Xata CLI (Mais prático)
```bash
# Instalar CLI
npm install -g @xata.io/cli

# Fazer login
xata auth login

# Criar schema via arquivo JSON
xata schema upload schema.json --branch main
```

### 2. Geração do Cliente TypeScript

Após criar o schema no Xata Cloud:

```bash
# Gerar o cliente TypeScript
npx xata codegen --output packages/xata-client/src/xata.ts

# Ou se estiver usando o CLI
xata pull main
```

### 3. Uso do Cliente para Manipular Dados

Agora sim você pode usar a ORM para CRUD:

```typescript
import { getXataClient } from '@mktplace/xata-client';

const xata = getXataClient();

// CREATE
const brand = await xata.db.brands.create({
  id: 'brand_123',
  name: 'Nike',
  slug: 'nike',
  description: 'Just Do It',
  is_active: true
});

// READ
const brands = await xata.db.brands.getAll();

// UPDATE
await xata.db.brands.update('brand_123', {
  description: 'Updated description'
});

// DELETE
await xata.db.brands.delete('brand_123');
```

## 🔧 Script de Automação Completo

### 1. Criar arquivo de schema (`schema/marketplace-schema.json`):

```json
{
  "tables": [
    {
      "name": "brands",
      "columns": [
        {"name": "id", "type": "string", "unique": true, "notNull": true},
        {"name": "name", "type": "string", "notNull": true},
        {"name": "slug", "type": "string", "unique": true, "notNull": true},
        {"name": "description", "type": "text"},
        {"name": "logo_url", "type": "string"},
        {"name": "website", "type": "string"},
        {"name": "is_active", "type": "bool", "defaultValue": true},
        {"name": "created_at", "type": "datetime", "defaultValue": "now()"},
        {"name": "updated_at", "type": "datetime", "defaultValue": "now()"}
      ]
    },
    {
      "name": "categories",
      "columns": [
        {"name": "id", "type": "string", "unique": true, "notNull": true},
        {"name": "name", "type": "string", "notNull": true},
        {"name": "slug", "type": "string", "unique": true, "notNull": true},
        {"name": "description", "type": "text"},
        {"name": "parent_id", "type": "link", "link": {"table": "categories"}},
        {"name": "image_url", "type": "string"},
        {"name": "is_active", "type": "bool", "defaultValue": true},
        {"name": "display_order", "type": "int", "defaultValue": 0},
        {"name": "created_at", "type": "datetime", "defaultValue": "now()"},
        {"name": "updated_at", "type": "datetime", "defaultValue": "now()"}
      ]
    },
    {
      "name": "products",
      "columns": [
        {"name": "id", "type": "string", "unique": true, "notNull": true},
        {"name": "sku", "type": "string", "unique": true, "notNull": true},
        {"name": "name", "type": "string", "notNull": true},
        {"name": "slug", "type": "string", "unique": true, "notNull": true},
        {"name": "description", "type": "text"},
        {"name": "brand_id", "type": "link", "link": {"table": "brands"}},
        {"name": "category_id", "type": "link", "link": {"table": "categories"}},
        {"name": "price", "type": "float", "notNull": true},
        {"name": "original_price", "type": "float"},
        {"name": "quantity", "type": "int", "defaultValue": 0},
        {"name": "is_active", "type": "bool", "defaultValue": true},
        {"name": "featured", "type": "bool", "defaultValue": false},
        {"name": "created_at", "type": "datetime", "defaultValue": "now()"},
        {"name": "updated_at", "type": "datetime", "defaultValue": "now()"}
      ]
    }
  ]
}
```

### 2. Script de setup (`scripts/setup-xata-schema.sh`):

```bash
#!/bin/bash

echo "🚀 Configurando schema no Xata..."

# Upload do schema
xata schema upload schema/marketplace-schema.json --branch main

echo "✅ Schema criado no Xata Cloud"

# Gerar cliente TypeScript
echo "📦 Gerando cliente TypeScript..."
npx xata codegen --output packages/xata-client/src/xata.ts

echo "✅ Cliente gerado com sucesso"

# Rodar seeds
echo "🌱 Populando banco de dados..."
node scripts/seed/seed-xata-data.mjs

echo "✅ Setup completo!"
```

### 3. Script de seed usando Xata ORM (`scripts/seed/seed-xata-data.mjs`):

```javascript
import { getXataClient } from '../../packages/xata-client/dist/xata.js';

const xata = getXataClient();

async function seedBrands() {
  console.log('🏷️  Inserindo marcas...');
  
  const brands = [
    { id: 'brand_nike', name: 'Nike', slug: 'nike', description: 'Just Do It' },
    { id: 'brand_adidas', name: 'Adidas', slug: 'adidas', description: 'Impossible is Nothing' },
    { id: 'brand_puma', name: 'Puma', slug: 'puma', description: 'Forever Faster' }
  ];

  for (const brand of brands) {
    try {
      await xata.db.brands.create(brand);
      console.log(`✅ Marca ${brand.name} criada`);
    } catch (error) {
      if (error.message.includes('unique constraint')) {
        console.log(`⚠️  Marca ${brand.name} já existe`);
      } else {
        throw error;
      }
    }
  }
}

async function seedCategories() {
  console.log('📁 Inserindo categorias...');
  
  const categories = [
    { id: 'cat_roupas', name: 'Roupas', slug: 'roupas' },
    { id: 'cat_calcados', name: 'Calçados', slug: 'calcados' },
    { id: 'cat_acessorios', name: 'Acessórios', slug: 'acessorios' }
  ];

  for (const category of categories) {
    try {
      await xata.db.categories.create(category);
      console.log(`✅ Categoria ${category.name} criada`);
    } catch (error) {
      if (error.message.includes('unique constraint')) {
        console.log(`⚠️  Categoria ${category.name} já existe`);
      } else {
        throw error;
      }
    }
  }
}

async function seedProducts() {
  console.log('📦 Inserindo produtos...');
  
  const products = [
    {
      id: 'prod_001',
      sku: 'NK-SH-001',
      name: 'Nike Air Max 90',
      slug: 'nike-air-max-90',
      description: 'O clássico tênis Nike Air Max 90',
      brand_id: 'brand_nike',
      category_id: 'cat_calcados',
      price: 599.90,
      original_price: 799.90,
      quantity: 50,
      featured: true
    },
    {
      id: 'prod_002',
      sku: 'AD-SH-001',
      name: 'Adidas Ultraboost 22',
      slug: 'adidas-ultraboost-22',
      description: 'Tênis de corrida com tecnologia Boost',
      brand_id: 'brand_adidas',
      category_id: 'cat_calcados',
      price: 899.90,
      quantity: 30
    }
  ];

  for (const product of products) {
    try {
      await xata.db.products.create(product);
      console.log(`✅ Produto ${product.name} criado`);
    } catch (error) {
      if (error.message.includes('unique constraint')) {
        console.log(`⚠️  Produto ${product.name} já existe`);
      } else {
        throw error;
      }
    }
  }
}

async function main() {
  try {
    await seedBrands();
    await seedCategories();
    await seedProducts();
    
    console.log('🎉 Seed concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    process.exit(1);
  }
}

main();
```

## 🚨 Limitações Importantes do Xata

1. **Não é possível criar/alterar schema via ORM** - apenas via painel web, CLI ou API REST
2. **Campos especiais do Xata** são criados automaticamente (`xata_id`, `xata_version`, etc.)
3. **Relacionamentos** devem usar o tipo `link` no schema
4. **Transações** têm suporte limitado comparado a Postgres puro
5. **Migrações** são gerenciadas automaticamente pelo Xata

## 📝 Melhores Práticas

1. **Sempre defina o schema primeiro** no Xata Cloud
2. **Use IDs customizados** para facilitar relacionamentos e evitar duplicatas
3. **Implemente tratamento de erros** para constraints únicos
4. **Use batch operations** quando possível para melhor performance
5. **Mantenha o cliente sempre atualizado** após mudanças no schema

## 🔄 Fluxo de Desenvolvimento Recomendado

1. **Desenvolvimento Local**:
   - Use branch de desenvolvimento no Xata
   - Teste mudanças de schema no painel web
   - Gere cliente atualizado

2. **CI/CD**:
   - Mantenha schema versionado em JSON
   - Use Xata CLI em pipelines
   - Automatize geração do cliente

3. **Produção**:
   - Use branches do Xata para deploy seguro
   - Teste migrações em staging primeiro
   - Mantenha backups regulares

## 🛠️ Comandos Úteis

```bash
# Verificar status do banco
xata branch list

# Criar novo branch
xata branch create staging

# Comparar schemas entre branches
xata schema diff main staging

# Fazer merge de mudanças
xata branch merge staging main

# Exportar schema atual
xata schema dump -o schema-backup.json
```

## 📚 Recursos Adicionais

- [Documentação Oficial do Xata](https://xata.io/docs)
- [API Reference](https://xata.io/docs/api-reference)
- [Xata CLI Guide](https://xata.io/docs/cli)
- [TypeScript SDK](https://xata.io/docs/sdk/typescript/overview)

---

**Lembre-se**: O Xata é uma plataforma serverless que gerencia o schema de forma diferente de bancos tradicionais. Aceite essas limitações e trabalhe dentro do modelo proposto pela plataforma para obter os melhores resultados. 