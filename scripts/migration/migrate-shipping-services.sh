#!/bin/bash

echo "🚀 Iniciando migração para UnifiedShippingService..."

# Backup dos arquivos
echo "📦 Criando backup dos arquivos..."
mkdir -p backup/shipping-services
cp -r apps/store/src/lib/services/{shippingCartService.ts,AdvancedShippingService.ts,universalShippingService.ts} backup/shipping-services/ 2>/dev/null || true

# Encontrar arquivos que importam os serviços antigos
echo "🔍 Procurando arquivos que usam os serviços antigos..."

files_to_update=$(grep -r -l -E "(shippingCartService|AdvancedShippingService|universalShippingService)" apps/store/src --include="*.ts" --include="*.svelte" --exclude-dir="services" || true)

if [ -z "$files_to_update" ]; then
    echo "✅ Nenhum arquivo encontrado para atualizar"
else
    echo "📝 Arquivos encontrados para atualizar:"
    echo "$files_to_update" | while read -r file; do
        echo "  - $file"
    done
    
    # Atualizar imports
    echo -e "\n🔄 Atualizando imports..."
    
    echo "$files_to_update" | while read -r file; do
        if [ -f "$file" ]; then
            echo "  Processando: $file"
            
            # Substituir imports
            sed -i '' -e "s|from '\$lib/services/shippingCartService'|from '\$lib/services/unifiedShippingService'|g" "$file"
            sed -i '' -e "s|from '\$lib/services/AdvancedShippingService'|from '\$lib/services/unifiedShippingService'|g" "$file"
            sed -i '' -e "s|from '\$lib/services/universalShippingService'|from '\$lib/services/unifiedShippingService'|g" "$file"
            
            # Substituir nomes das classes
            sed -i '' -e "s|ShippingCartService|UnifiedShippingService|g" "$file"
            sed -i '' -e "s|AdvancedShippingService|UnifiedShippingService|g" "$file"
            sed -i '' -e "s|UniversalShippingService|UnifiedShippingService|g" "$file"
            
            # Substituir tipos
            sed -i '' -e "s|AdvancedShippingOption|UnifiedShippingOption|g" "$file"
            sed -i '' -e "s|SellerShippingQuote|UnifiedShippingQuote|g" "$file"
            sed -i '' -e "s|ShippingCalculationResult|UnifiedShippingQuote|g" "$file"
            sed -i '' -e "s|ShippingCalculationRequest|UnifiedShippingRequest|g" "$file"
        fi
    done
fi

# Criar guia de migração
echo -e "\n📚 Criando guia de migração..."
cat > MIGRACAO_SHIPPING_SERVICES.md << 'EOF'
# Guia de Migração - Unified Shipping Service

## 🔄 Mudanças Principais

### Serviços Consolidados
- `ShippingCartService` → `UnifiedShippingService`
- `AdvancedShippingService` → `UnifiedShippingService`
- `UniversalShippingService` → `UnifiedShippingService`

### Novos Tipos
```typescript
// Antes
import type { AdvancedShippingOption } from '$lib/services/AdvancedShippingService';
import type { SellerShippingQuote } from '$lib/services/shippingCartService';

// Depois
import type { UnifiedShippingOption, UnifiedShippingQuote } from '$lib/services/unifiedShippingService';
```

### Métodos Principais

#### Calcular frete para carrinho
```typescript
// Antes (ShippingCartService)
const quotes = await ShippingCartService.calculateShippingForCart(postalCode, cartItems);

// Depois
const quotes = await UnifiedShippingService.calculateShippingForCart(platform, postalCode, cartItems);
```

#### Calcular frete para seller
```typescript
// Antes
const result = await ShippingCartService.calculateShippingForSeller(postalCode, items, sellerId);

// Depois
const quote = await UnifiedShippingService.calculateShippingForSeller(platform, {
  postalCode,
  items,
  sellerId,
  useCache: true
});
```

### Métodos Utilitários
Todos os métodos utilitários foram mantidos:
- `getCheapestOption()`
- `getFastestOption()`
- `calculateCartShippingTotal()`
- `validatePostalCode()`
- `formatPostalCode()`

## ✅ Benefícios da Consolidação

1. **Código Unificado**: Uma única fonte de verdade para cálculos de frete
2. **Cache Inteligente**: Sistema de cache integrado para melhor performance
3. **Tipos Consistentes**: Interfaces unificadas em todo o sistema
4. **Menos Duplicação**: Lógica consolidada em um único lugar
5. **Manutenção Simplificada**: Mais fácil adicionar novos recursos

## 🚨 Pontos de Atenção

1. O parâmetro `platform` agora é obrigatório em todos os métodos principais
2. O retorno agora é sempre `UnifiedShippingQuote` com campo `success` para indicar erros
3. O cache está habilitado por padrão (pode ser desabilitado com `useCache: false`)
EOF

echo -e "\n✅ Migração concluída!"
echo "📋 Resumo:"
echo "  - Backup criado em: backup/shipping-services/"
echo "  - Guia de migração: MIGRACAO_SHIPPING_SERVICES.md"

# Sugerir remoção dos arquivos antigos
echo -e "\n🗑️ Para remover os serviços antigos (após verificar que tudo funciona):"
echo "  rm apps/store/src/lib/services/shippingCartService.ts"
echo "  rm apps/store/src/lib/services/AdvancedShippingService.ts"
echo "  rm apps/store/src/lib/services/universalShippingService.ts" 