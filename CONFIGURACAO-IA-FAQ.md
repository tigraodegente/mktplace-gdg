# 🤖 CONFIGURAÇÃO COMPLETA - IA FAQ

## ⚡ **PARA IA FUNCIONAR 100% COMO ESTÁ:**

### 🔑 **1. VARIÁVEIS DE AMBIENTE (.env)**

Crie o arquivo `apps/store/.env` com:

```bash
# OBRIGATÓRIO PARA IA FUNCIONAR
OPENAI_API_KEY="sk-sua-chave-openai-aqui"
OPENAI_MODEL="gpt-4o-mini"
OPENAI_MAX_TOKENS=1500
OPENAI_TEMPERATURE=0.1

# BANCO DE DADOS (use sua conexão atual)
DATABASE_URL="sua-conexao-neon-aqui"
NEON_DATABASE_URL="sua-conexao-neon-aqui"

# CONFIGURAÇÕES IA FAQ
FAQ_AI_CACHE_TTL=3600
FAQ_AI_MAX_RESULTS=5
FAQ_AI_MIN_CONFIDENCE=0.3
FAQ_ANALYTICS_ENABLED=true

# AMBIENTE
NODE_ENV="development"
PUBLIC_ENV="development"
```

### 🗄️ **2. BANCO DE DADOS**

**Execute os scripts na ordem:**

```bash
# 1. Criar tabelas (execute 1x só)
psql $DATABASE_URL -f scripts/create-faq-tables.sql

# 2. Popular dados de exemplo (execute 1x só)  
psql $DATABASE_URL -f scripts/populate-faq-data.sql

# 3. Tabela analytics (opcional)
node scripts/active/create-ai-analytics-table.js
```

**OU via API (mais fácil):**
```bash
# Depois de deployar, chame:
curl -X POST http://localhost:5173/api/admin/create-faq-tables
curl -X POST http://localhost:5173/api/admin/populate-faq
```

### 🔌 **3. CONFIGURAR OPENAI**

**Como conseguir API Key:**
1. Acesse: https://platform.openai.com/api-keys
2. Faça login/cadastro
3. Clique "Create new secret key"  
4. Copie a chave (sk-...)
5. Cole no .env como OPENAI_API_KEY

**Custo estimado:**
- Busca IA: ~R$ 0,02 por consulta
- 100 buscas/dia = ~R$ 60/mês
- Modelo gpt-4o-mini é o mais barato

### ✅ **4. VERIFICAR SE FUNCIONA**

**Teste local:**
```bash
# 1. Instalar dependências
cd apps/store && pnpm install

# 2. Rodar projeto  
pnpm dev

# 3. Acessar: http://localhost:5173/atendimento

# 4. Testar:
# - Toggle IA/Busca funciona
# - Busca tradicional funciona sempre
# - Busca IA funciona se configurado OpenAI
```

**Teste de IA específico:**
```bash
# Verificar se IA responde
curl -X POST http://localhost:5173/api/atendimento/faq/ai-search \
  -H "Content-Type: application/json" \
  -d '{"query": "como cancelar pedido"}'
```

### 🎯 **5. FUNCIONALIDADES ATIVAS**

✅ **Sempre funciona:**
- Busca tradicional melhorada
- Interface UX otimizada  
- Filtros sutis
- Paginação inteligente
- Sistema de feedback

🤖 **Funciona com OpenAI:**
- Busca semântica inteligente
- Análise de intenções
- Score de relevância
- Sugestões de palavras-chave
- Analytics de IA

### ⚠️ **6. TROUBLESHOOTING**

**Erro "AI service unavailable":**
- Verificar OPENAI_API_KEY no .env
- Verificar se chave é válida
- Verificar saldo da conta OpenAI

**Erro "No FAQs available":**
- Executar script populate-faq-data.sql
- Verificar conexão banco de dados
- Verificar se tabelas foram criadas

**Busca IA não aparece:**
- Verificar se componente AISearch existe
- Verificar importação na página
- Verificar se toggle está funcionando

### 🔄 **7. MODO GRACEFUL**

**Sistema inteligente:**
- SEM OpenAI = só busca tradicional  
- COM OpenAI = busca tradicional + IA
- Se IA falha = fallback automático
- Nunca quebra a experiência

---

## 📊 **DADOS INCLUSOS**

**20 FAQ profissionais:**
- Pedidos e Entrega (4 FAQ)
- Produtos e Qualidade (4 FAQ)  
- Pagamentos e Preços (3 FAQ)
- Conta e Cadastro (3 FAQ)
- Trocas e Devoluções (3 FAQ)
- Suporte Técnico (3 FAQ)

**Dados realistas:**
- Contexto marketplace de alimentos
- Respostas detalhadas e úteis
- Métricas de visualização/voto
- Categorização inteligente

---

## 🚀 **STATUS FINAL**

✅ **Código 100% pronto**  
✅ **Interface completa**  
✅ **Banco estruturado**  
✅ **APIs funcionais**  
✅ **Fallback inteligente**  

**📝 Só falta: configurar .env e executar scripts de banco** 