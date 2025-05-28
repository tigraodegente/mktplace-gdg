# Guia Completo - Recriar Banco de Dados no Xata

## ⚠️ ATENÇÃO
Este processo irá **DELETAR TODOS OS DADOS** do banco atual e criar um novo do zero.

## 📋 Passo 1: Fazer Backup do Schema Atual

```bash
# Exportar schema atual como backup
xata schema dump --file schema/backup-schema-$(date +%Y%m%d-%H%M%S).json
```

## 🗑️ Passo 2: Deletar e Recriar o Banco no Xata

### Via Painel Web (Recomendado):

1. Acesse https://app.xata.io
2. Selecione o banco `mktplace-gdg`
3. Vá em **Settings** > **Database**
4. Clique em **Delete Database**
5. Confirme a exclusão
6. Crie um novo banco:
   - Nome: `mktplace-gdg`
   - Region: `us-east-1`
   - Deixe criar com branch `main`

### Via CLI (Alternativa):

```bash
# Deletar banco (precisa confirmação)
xata database delete mktplace-gdg

# Criar novo banco
xata database create mktplace-gdg --region us-east-1
```

## 🏗️ Passo 3: Criar Estrutura do Banco

Execute o script que criará todas as tabelas:

```bash
node scripts/create-tables-xata.mjs
```

Este script criará as seguintes tabelas:
- users
- brands
- categories
- sellers
- products
- product_images
- carts
- cart_items
- orders
- order_items

## 🔄 Passo 4: Atualizar Cliente Local

```bash
# Puxar o novo schema
npx xata pull main

# Recompilar o cliente
cd packages/xata-client
npm run build
cd ../..
```

## 🌱 Passo 5: Popular com Dados de Teste

Agora você pode usar o script de seed que funcionará corretamente:

```bash
node scripts/seed-all-xata.mjs
```

## ✅ Verificação

Para verificar se tudo funcionou:

```bash
# Testar inserção simples
node scripts/test-xata-simple.mjs
```

## 🚨 Troubleshooting

### Se o erro "column id cannot be null" persistir:

1. **Verifique o painel do Xata** se as tabelas foram criadas corretamente
2. **Verifique se o campo `id`** não tem configuração especial
3. **Tente criar um registro manualmente** no painel para testar

### Se precisar começar novamente:

```bash
# Execute todo o processo desde o início
./scripts/recreate-xata-database.sh
```

## 📝 Notas Importantes

1. **O Xata cria automaticamente** os campos:
   - `xata_id` (ID único do registro)
   - `xata_version` (controle de versão)
   - `xata_createdat` (timestamp de criação)
   - `xata_updatedat` (timestamp de atualização)

2. **Não é necessário** (e nem deve) incluir esses campos ao criar tabelas

3. **O campo `id` customizado** é opcional - o Xata usa `xata_id` como chave primária

4. **Links entre tabelas** devem ser criados após todas as tabelas existirem

## 🎯 Resultado Esperado

Após completar todos os passos, você terá:
- ✅ Banco limpo e estruturado
- ✅ Cliente TypeScript atualizado
- ✅ ORM do Xata funcionando corretamente
- ✅ Capacidade de inserir dados via ORM

## 💡 Dica Final

Se continuar com problemas, considere:
1. Usar apenas o `xata_id` gerado automaticamente
2. Não definir campo `id` customizado
3. Deixar o Xata gerenciar os IDs completamente 