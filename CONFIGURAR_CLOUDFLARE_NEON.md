# 🚀 CONFIGURAR CLOUDFLARE PAGES + NEON

## 🚨 **PROBLEMA ATUAL**
A aplicação remota usa dados fallback porque **não consegue conectar no banco**.

```json
{"source":"fallback"}  // ❌ Não está usando banco real
```

## ✅ **SOLUÇÃO COMPLETA**

### **ETAPA 1: Criar Hyperdrive no Cloudflare**

1. **Acesse**: https://dash.cloudflare.com
2. **Vá em**: `Hyperdrive` no menu lateral
3. **Clique**: `Create a Hyperdrive`
4. **Preencha**:
   - **Name**: `mktplace-neon-db`
   - **Description**: `Marketplace GDG - Neon PostgreSQL`
   - **Connection string**: 
     ```
     postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
     ```
5. **Clique**: `Create Hyperdrive`
6. **Copie o ID** do Hyperdrive criado (ex: `a1b2c3d4e5f6...`)

### **ETAPA 2: Configurar Pages Binding**

1. **Acesse**: https://dash.cloudflare.com
2. **Vá em**: `Pages` → `mktplace-store`
3. **Clique em**: `Settings` → `Functions`
4. **Na seção "Bindings"**, clique `Add binding`
5. **Configure**:
   - **Binding name**: `HYPERDRIVE_DB`
   - **Type**: `Hyperdrive`
   - **Hyperdrive**: `mktplace-neon-db` (selecione o criado na Etapa 1)
6. **Clique**: `Save`

### **ETAPA 3: Adicionar Variáveis de Ambiente**

1. **Ainda em Pages** → `Settings` → `Environment variables`
2. **Production Environment** → `Add variable`
3. **Adicione**:
   ```
   DATABASE_URL = postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
   NODE_ENV = production
   ```
4. **Clique**: `Save`

### **ETAPA 4: Atualizar wrangler.toml (JÁ FEITO ✅)**

```toml
# O wrangler.toml já foi atualizado com:
[[hyperdrive]]
binding = "HYPERDRIVE_DB"
id = "SEU_HYPERDRIVE_ID_AQUI"  # Substitua pelo ID da Etapa 1
localConnectionString = "postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
```

### **ETAPA 5: Fazer Deploy**

```bash
cd apps/store
git add .
git commit -m "feat: configurar Hyperdrive para produção"
git push origin main
```

**OU** force um redeploy no Cloudflare Pages:
- Pages → mktplace-store → Deployments → `Retry deployment`

## 🧪 **TESTAR A CORREÇÃO**

### **1. Verificar se conectou no banco:**
```bash
curl https://mktplace-store.pages.dev/api/debug/hyperdrive
# Esperado: has_hyperdrive_binding: true
```

### **2. Testar APIs com dados reais:**
```bash
curl https://mktplace-store.pages.dev/api/products/featured
# Esperado: "source":"database" (não mais "fallback")
```

### **3. Verificar quantidade de produtos:**
```bash
curl -s https://mktplace-store.pages.dev/api/products/featured | jq '.data.products | length'
# Esperado: 54 produtos (do banco Neon)
```

## 📊 **RESULTADO ESPERADO**

### ANTES (Problema):
```json
{
  "success": true,
  "data": {...},
  "source": "fallback"  // ❌ Dados mockados
}
```

### DEPOIS (Sucesso):
```json
{
  "success": true,
  "data": {...},
  "source": "database"  // ✅ Dados do Neon
}
```

## 🚨 **TROUBLESHOOTING**

### **Se ainda mostrar "fallback":**

1. **Verificar binding no Dashboard:**
   - Pages → mktplace-store → Settings → Functions → Bindings
   - **Deve ter**: `HYPERDRIVE_DB` → `mktplace-neon-db`

2. **Verificar Hyperdrive criado:**
   - Dashboard → Hyperdrive
   - **Status**: `Active`
   - **Connection**: `Healthy`

3. **Force redeploy:**
   ```bash
   # Commit vazio para triggerar rebuild
   git commit --allow-empty -m "fix: force redeploy with hyperdrive"
   git push origin main
   ```

### **Se der erro de conexão:**

1. **Verificar connection string do Neon:**
   - Neon Dashboard → Connect
   - **Copiar exata** a connection string

2. **Testar conexão local:**
   ```bash
   psql "postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb"
   ```

## 🎯 **RESUMO**

Para a aplicação remota usar o banco Neon:

1. ✅ **Hyperdrive criado** no Cloudflare
2. ✅ **Binding configurado** no Pages (HYPERDRIVE_DB)
3. ✅ **Variáveis de ambiente** adicionadas
4. ✅ **wrangler.toml** atualizado
5. ✅ **Deploy** realizado

**Após isso, a aplicação remota terá acesso aos 54 produtos, 4.068 zonas de frete e todos os dados do banco Neon!** 🎉 