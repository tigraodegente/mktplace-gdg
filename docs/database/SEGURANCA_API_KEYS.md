# 🔐 SEGURANÇA DE API KEYS - GUIA CRÍTICO

## ⚠️ ALERTA IMPORTANTE

**NUNCA, JAMAIS, EM HIPÓTESE ALGUMA:**
- ❌ Compartilhe API keys em chats públicos
- ❌ Commite API keys no Git
- ❌ Exponha keys em logs ou screenshots
- ❌ Use keys no código frontend
- ❌ Envie keys por email ou mensagem

## 🛡️ CONFIGURAÇÃO SEGURA

### 1. Criar arquivo `.env.local`
```bash
# Criar arquivo local (NUNCA será commitado)
touch .env.local

# Adicionar ao .gitignore IMEDIATAMENTE
echo ".env.local" >> .gitignore
echo ".env*.local" >> .gitignore
```

### 2. Estrutura do `.env.local`
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-sua-chave-real-aqui
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# Rate Limiting (importante!)
OPENAI_RATE_LIMIT_PER_MINUTE=20
OPENAI_RATE_LIMIT_PER_DAY=1000

# Alerts
AI_COST_ALERT_THRESHOLD=100
```

### 3. Usar no código com segurança
```javascript
// ✅ CORRETO - Sempre validar
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY não configurada');
}

// ✅ CORRETO - Nunca logar a key
console.log('OpenAI configurado'); // SEM a key!

// ❌ ERRADO - Nunca fazer isso
console.log(`Key: ${process.env.OPENAI_API_KEY}`);
```

## 🚨 SE VOCÊ EXPÔS UMA KEY:

### Ações IMEDIATAS (faça AGORA):

1. **Vá para o dashboard da OpenAI**
   - https://platform.openai.com/api-keys

2. **Revogue a key comprometida**
   - Clique nos 3 pontos → Delete key

3. **Crie uma nova key**
   - Create new secret key
   - Copie e guarde com segurança

4. **Verifique uso não autorizado**
   - Check Usage → Ver se teve uso anormal

5. **Configure limites de gasto**
   - Billing → Set monthly budget

## 🔒 MELHORES PRÁTICAS

### 1. Rotação de Keys
```javascript
// Rotacione keys a cada 90 dias
const KEY_ROTATION_DAYS = 90;

// Alerta para rotação
if (daysSinceKeyCreated > KEY_ROTATION_DAYS) {
  console.warn('⚠️ Hora de rotacionar a API key!');
}
```

### 2. Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 20, // máximo 20 requests
  message: 'Muitas requisições, tente novamente em breve'
});

app.use('/api/enrich', aiLimiter);
```

### 3. Monitoramento de Custos
```javascript
// Tracking de custos
const trackAPIUsage = async (tokens, cost) => {
  const usage = {
    date: new Date(),
    tokens,
    cost,
    endpoint: 'gpt-4-turbo'
  };
  
  await db.insert('api_usage', usage);
  
  // Alerta se passar do limite
  const dailyCost = await getDailyCost();
  if (dailyCost > process.env.AI_COST_ALERT_THRESHOLD) {
    await sendAlert('Custo de API excedeu limite diário!');
  }
};
```

### 4. Ambiente de Produção
```javascript
// Em produção, use serviços de secrets
// Exemplo: AWS Secrets Manager, Vercel Env, etc

// Vercel
const apiKey = process.env.OPENAI_API_KEY;

// AWS Secrets Manager
import { getSecret } from '@aws-sdk/client-secrets-manager';
const apiKey = await getSecret('openai-api-key');
```

## 📋 CHECKLIST DE SEGURANÇA

### Antes de Desenvolver:
- [ ] `.env.local` criado
- [ ] `.gitignore` atualizado
- [ ] Keys no `.env.example` são falsas
- [ ] Validação de environment variables

### Durante Desenvolvimento:
- [ ] Nunca logar keys
- [ ] Usar HTTPS sempre
- [ ] Rate limiting implementado
- [ ] Monitoramento de custos

### Antes de Deploy:
- [ ] Keys em serviço de secrets
- [ ] Logs não expõem dados sensíveis
- [ ] Backup das keys em local seguro
- [ ] Limites de budget configurados

## 🔄 PROCESSO DE ROTAÇÃO

### A cada 90 dias:
1. Gerar nova key na OpenAI
2. Atualizar em todos os ambientes
3. Testar funcionamento
4. Revogar key antiga
5. Documentar rotação

### Registro de Rotação:
```markdown
## Histórico de Rotação de Keys

| Data | Ação | Responsável | Próxima Rotação |
|------|------|-------------|-----------------|
| 2024-12-10 | Key inicial criada | Dev | 2025-03-10 |
| - | - | - | - |
```

## 🆘 CONTATOS DE EMERGÊNCIA

### Se houver comprometimento:
1. **OpenAI Support**: https://platform.openai.com/support
2. **Revisar Usage**: https://platform.openai.com/usage
3. **Billing Alerts**: https://platform.openai.com/account/billing
4. **Team Lead**: Notificar imediatamente

## 💡 DICAS EXTRAS

### 1. Use variáveis específicas por ambiente
```bash
# Desenvolvimento
OPENAI_API_KEY_DEV=sk-proj-xxx-dev

# Staging  
OPENAI_API_KEY_STAGING=sk-proj-xxx-staging

# Produção
OPENAI_API_KEY_PROD=sk-proj-xxx-prod
```

### 2. Implemente circuit breaker
```javascript
// Se muitos erros, para de chamar API
const circuitBreaker = {
  failures: 0,
  maxFailures: 5,
  timeout: 60000, // 1 minuto
  
  async call(fn) {
    if (this.failures >= this.maxFailures) {
      throw new Error('Circuit breaker OPEN - too many failures');
    }
    
    try {
      const result = await fn();
      this.failures = 0; // Reset on success
      return result;
    } catch (error) {
      this.failures++;
      throw error;
    }
  }
};
```

### 3. Logs seguros
```javascript
// ✅ CORRETO
logger.info('OpenAI request', {
  model: 'gpt-4-turbo',
  tokens: 150,
  success: true
  // SEM incluir a key ou conteúdo sensível
});

// ❌ ERRADO
logger.info('OpenAI request', {
  apiKey: process.env.OPENAI_API_KEY, // NUNCA!
  prompt: userPrompt // Pode ter dados sensíveis
});
```

---

**LEMBRE-SE**: A segurança das API keys é responsabilidade de TODOS. Um descuido pode custar caro! 🔐 