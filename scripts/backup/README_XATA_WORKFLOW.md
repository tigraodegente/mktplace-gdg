# Guia Prático - Trabalhando com Xata no Marketplace

## 🚀 Quick Start

### 1. Verificar Schema Atual
```bash
# Exportar schema atual do Xata Cloud
./scripts/export-xata-schema.sh
```

### 2. Atualizar Cliente TypeScript
```bash
# Sempre que o schema mudar no Xata Cloud
npx xata codegen --output packages/xata-client/src/xata.ts
```

### 3. Popular Banco com Dados de Teste
```bash
# Usar o cliente Xata (recomendado)
node scripts/seed/seed-all-xata.mjs
```

## 📋 Fluxo de Trabalho Completo

### Passo 1: Criar/Modificar Schema

**⚠️ IMPORTANTE**: O schema DEVE ser criado primeiro no Xata Cloud!

#### Opção A: Via Painel Web (Mais Fácil)
1. Acesse https://app.xata.io
2. Navegue até seu database
3. Crie/modifique tabelas e campos
4. O Xata adiciona automaticamente campos especiais

#### Opção B: Via API REST
```bash
# Exemplo: Criar tabela de produtos
curl -X POST https://api.xata.io/db/$XATA_WORKSPACE/$XATA_DATABASE/tables \
  -H "Authorization: Bearer $XATA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @schema/products-table.json
```

### Passo 2: Sincronizar Cliente Local
```bash
# Após qualquer mudança no schema
npx xata pull main

# Ou regenerar o cliente
npx xata codegen --output packages/xata-client/src/xata.ts
```

### Passo 3: Usar o Cliente para Dados

```javascript
// Exemplo de uso
import { getXataClient } from '@mktplace/xata-client';

const xata = getXataClient();

// Criar registro
const product = await xata.db.products.create({
  name: 'Produto Teste',
  slug: 'produto-teste',
  price: 99.90
});

// Buscar registros
const products = await xata.db.products
  .filter({ is_active: true })
  .sort('created_at', 'desc')
  .getPaginated({ size: 20 });
```

## 🔧 Scripts Disponíveis

### Seeds com Xata ORM
- `scripts/seed/seed-all-xata.mjs` - Seed completo usando ORM
- `scripts/seed/seed_brands.mjs` - Apenas marcas
- `scripts/seed/seed_categories.mjs` - Apenas categorias
- `scripts/seed/seed_products.mjs` - Apenas produtos

### Utilitários
- `scripts/export-xata-schema.sh` - Exporta schema atual
- `scripts/verify-migration.sh` - Verifica status das tabelas

## ❌ O que NÃO Fazer

1. **NÃO tente criar tabelas via ORM** - Use o painel ou API REST
2. **NÃO modifique campos xata_*** ** - São gerenciados automaticamente
3. **NÃO use SQL direto** - Use sempre a ORM do Xata
4. **NÃO esqueça de regenerar o cliente** após mudanças no schema

## ✅ Boas Práticas

1. **IDs Customizados**: Use IDs previsíveis para facilitar relacionamentos
   ```javascript
   { id: 'brand_nike', name: 'Nike', slug: 'nike' }
   ```

2. **Tratamento de Erros**: Sempre trate constraints únicos
   ```javascript
   try {
     await xata.db.brands.create(data);
   } catch (error) {
     if (error.message.includes('unique')) {
       console.log('Registro já existe');
     }
   }
   ```

3. **Batch Operations**: Use para melhor performance
   ```javascript
   await xata.db.products.create([
     { name: 'Produto 1' },
     { name: 'Produto 2' },
     { name: 'Produto 3' }
   ]);
   ```

4. **Paginação**: Sempre use para listas grandes
   ```javascript
   const { records, meta } = await xata.db.products
     .getPaginated({ size: 50 });
   ```

## 🐛 Troubleshooting

### Erro: "Table not found in schema"
- **Causa**: Cliente desatualizado
- **Solução**: `npx xata pull main`

### Erro: "Unique constraint violation"
- **Causa**: Tentando inserir registro duplicado
- **Solução**: Verificar se registro já existe antes de criar

### Erro: "Invalid column"
- **Causa**: Campo não existe no schema
- **Solução**: Adicionar campo no painel Xata primeiro

### Erro: "Authentication failed"
- **Causa**: API key inválida ou expirada
- **Solução**: Verificar variáveis de ambiente

## 📚 Links Úteis

- [Painel Xata](https://app.xata.io)
- [Documentação Xata](https://xata.io/docs)
- [API Reference](https://xata.io/docs/api-reference)
- [TypeScript SDK](https://xata.io/docs/sdk/typescript/overview)

## 💡 Dicas Finais

1. **Branches**: Use branches do Xata para desenvolvimento
   ```bash
   xata branch create dev
   xata branch switch dev
   ```

2. **Migrations**: São automáticas, mas você pode ver o histórico
   ```bash
   ls -la .xata/migrations/
   ```

3. **Performance**: Use índices e queries otimizadas
   ```javascript
   // Bom - usa índice
   await xata.db.products.filter({ slug: 'nike-air-max' }).getFirst();
   
   // Evitar - scan completo
   await xata.db.products.getAll().find(p => p.slug === 'nike-air-max');
   ```

---

**Lembre-se**: O Xata é diferente de ORMs tradicionais. Aceite suas limitações e aproveite seus benefícios! 