#!/bin/bash

echo "⏱️ Analisando timeouts longos..."

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${YELLOW}Timeouts encontrados por categoria:${NC}"
echo ""

# Analisar timeouts por tipo
echo "📊 1. Timeouts de Teste/Debug (podem ser mantidos):"
grep -r "setTimeout.*resolve.*Math.random" apps/store/src --include="*.ts" --include="*.svelte" | awk -F: '{print "  • " $1}'

echo -e "\n⚠️ 2. Timeouts de Retry/Delay (otimizar para exponential backoff):"
grep -r "setTimeout.*resolve.*1000.*attempt" apps/store/src --include="*.ts" --include="*.svelte" | awk -F: '{print "  • " $1}'

echo -e "\n🚨 3. Timeouts Fixos Longos (revisar necessidade):"
grep -r "setTimeout.*reject.*[0-9]\{4,\}" apps/store/src --include="*.ts" --include="*.svelte" | grep -v "Math.random" | head -10 | awk -F: '{print "  • " $1 " (" $2 "ms)"}'

echo -e "\n${GREEN}Recomendações:${NC}"
echo ""
echo "1. **Para timeouts de API** (3-10s):"
echo "   - Use AbortController ao invés de Promise race"
echo "   - Configure timeout no fetch diretamente"
echo "   - Exemplo:"
echo -e "${GREEN}   const controller = new AbortController();"
echo "   const timeoutId = setTimeout(() => controller.abort(), 5000);"
echo "   const response = await fetch(url, { signal: controller.signal });"
echo -e "   clearTimeout(timeoutId);${NC}"
echo ""

echo "2. **Para delays de retry** (exponential backoff):"
echo -e "${GREEN}   const delay = Math.min(1000 * Math.pow(2, attempt), 30000);"
echo -e "   await new Promise(resolve => setTimeout(resolve, delay));${NC}"
echo ""

echo "3. **Para timeouts de UI** (mensagens temporárias):"
echo "   - Use Svelte stores com auto-clear"
echo "   - Mantenha curto (2-4s)"
echo ""

echo "4. **Para polling/check status**:"
echo "   - Use estratégia progressiva"
echo "   - Comece rápido (1s) e aumente gradualmente"
echo ""

# Criar arquivo de configuração sugerida
cat > timeout-config-suggestion.ts << 'EOF'
// Configuração centralizada de timeouts sugerida

export const TIMEOUT_CONFIG = {
  // API Timeouts
  api: {
    default: 5000,      // 5s padrão
    auth: 10000,        // 10s para auth (pode ser mais lento)
    upload: 30000,      // 30s para uploads
    payment: 15000,     // 15s para pagamentos
    search: 3000,       // 3s para busca
  },
  
  // UI Timeouts  
  ui: {
    notification: 4000, // 4s para notificações
    loading: 500,       // 500ms antes de mostrar loading
    debounce: 300,      // 300ms para debounce
  },
  
  // Retry Configuration
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,    // 1s
    maxDelay: 30000,    // 30s max
    backoffFactor: 2,
  }
};

// Helper para criar timeout com AbortController
export function createTimeout(ms: number = TIMEOUT_CONFIG.api.default) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  };
}

// Helper para retry com exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options = TIMEOUT_CONFIG.retry
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < options.maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < options.maxAttempts - 1) {
        const delay = Math.min(
          options.baseDelay * Math.pow(options.backoffFactor, i),
          options.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
EOF

echo -e "\n${GREEN}✓ Arquivo de configuração criado: timeout-config-suggestion.ts${NC}"
echo ""
echo "📋 Próximos passos:"
echo "1. Revise os timeouts longos identificados"
echo "2. Implemente a configuração centralizada"
echo "3. Substitua Promise race por AbortController"
echo "4. Use exponential backoff para retries" 