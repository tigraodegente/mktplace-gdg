# 🚀 CONFIGURAR CLOUDFLARE PAGES + NEON (TCP DIRETO)

## 🚨 **PROBLEMA ATUAL**
A aplicação remota usa dados fallback porque **não consegue conectar no banco**.

```json
{"source":"fallback"}  // ❌ Não está usando banco real
```

## ✅ **SOLUÇÃO: TCP DIRETO (SEM HYPERDRIVE)**

> **❌ Hyperdrive NÃO funciona** com PostgreSQL externo como Neon
> **✅ TCP direto** é a abordagem correta

### **ETAPA 1: Configurar Variáveis de Ambiente**

1. **Acesse**: https://dash.cloudflare.com
2. **Vá em**: `Pages` → `mktplace-store`
3. **Clique em**: `Settings` → `Environment variables`
4. **Production Environment** → `Add variable`
5. **Adicione**:
   ```
   DATABASE_URL = postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
   NODE_ENV = production
   ```
6. **Clique**: `Save`

### **ETAPA 2: Verificar wrangler.toml (JÁ CONFIGURADO ✅)**

```toml
# ✅ Configuração TCP direto (sem Hyperdrive)
[limits]
cpu_ms = 120000  # CPU estendido para TCP

[vars]
NODE_ENV = "production"
DATABASE_URL = "postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
```

### **ETAPA 3: Fazer Deploy**

```bash
cd apps/store
git add .
git commit -m "fix: usar TCP direto (sem Hyperdrive) para Neon"
git push origin main
```

**OU** force um redeploy no Cloudflare Pages:
- Pages → mktplace-store → Deployments → `Retry deployment`

## 🧪 **TESTAR A CORREÇÃO**

### **1. Testar APIs com dados reais:**
```bash
curl https://mktplace-store.pages.dev/api/products/featured
# Esperado: "source":"database" (não mais "fallback")
```

### **2. Verificar quantidade de produtos:**
```bash
curl -s https://mktplace-store.pages.dev/api/products/featured | jq '.data.products | length'
# Esperado: 54 produtos (do banco Neon)
```

### **3. Verificar timeout está OK:**
```bash
time curl https://mktplace-store.pages.dev/api/products/search-suggestions
# Esperado: < 30 segundos (antes era 32+ segundos)
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

1. **Verificar variáveis no Dashboard:**
   - Pages → mktplace-store → Settings → Environment variables
   - **Deve ter**: `DATABASE_URL` com connection string do Neon

2. **Force redeploy:**
   ```bash
   # Commit vazio para triggerar rebuild
   git commit --allow-empty -m "fix: force redeploy with TCP direto"
   git push origin main
   ```

### **Se der timeout (>30s):**

1. **Verificar CPU limits:**
   - `wrangler.toml` deve ter `cpu_ms = 120000`

2. **Otimizar queries:**
   - Verificar se queries estão usando índices
   - Limitar LIMIT nas consultas grandes

### **Se der erro de conexão:**

1. **Testar conexão local:**
   ```bash
   psql "postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb"
   ```

2. **Verificar status do Neon:**
   - Neon Dashboard → Status
   - **Deve estar**: `Active` e `Healthy`

## 🎯 **RESUMO**

Para a aplicação remota usar o banco Neon **SEM Hyperdrive**:

1. ✅ **TCP direto** configurado no wrangler.toml
2. ✅ **CPU estendido** (120s) para evitar timeout
3. ✅ **Variáveis de ambiente** no Cloudflare Pages
4. ✅ **Deploy** realizado

**Após isso, a aplicação remota terá acesso aos 54 produtos, 4.068 zonas de frete e todos os dados do banco Neon!** 🎉

## 🔧 **POR QUE NÃO HYPERDRIVE?**

- ❌ **Incompatível** com PostgreSQL externo
- ❌ **Problemas de timeout** e desconexão 
- ❌ **Limitações de SSL** com Neon
- ✅ **TCP direto é mais confiável** para PostgreSQL externo 