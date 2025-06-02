# Exemplo de Funcionamento das Modalidades de Frete

## Conceito

O sistema oferece duas modalidades de frete para atender diferentes necessidades:

### 1. **Entrega Expressa** (por item)
- Cada item é enviado separadamente
- Cobrança individual por produto
- Prazo de entrega mais rápido
- Ideal para itens urgentes ou de alto valor

### 2. **Entrega Agrupada** (por remessa) 
- Todos os itens do mesmo vendedor são agrupados em um único pacote
- Cobrança única por remessa
- Prazo de entrega estendido (mais econômico)
- Ideal para compras maiores sem urgência

## Exemplo Prático

### Carrinho de Compras
```
Vendedor: Loja ABC
- Produto A: R$ 50,00 (peso: 0.5kg) x 2 unidades
- Produto B: R$ 30,00 (peso: 0.3kg) x 1 unidade
Total: R$ 130,00 | Peso total: 1.3kg

Vendedor: Loja XYZ  
- Produto C: R$ 100,00 (peso: 1kg) x 1 unidade
Total: R$ 100,00 | Peso total: 1kg
```

### Opções de Frete (CEP: 01310-100)

#### **Vendedor: Loja ABC**

**1. Entrega Expressa - 3 dias úteis (por item)**
```
Produto A (2 unidades): R$ 15,00 x 2 = R$ 30,00
Produto B (1 unidade): R$ 12,00 x 1 = R$ 12,00
Total do frete: R$ 42,00
```

**2. Entrega Agrupada - 5 dias úteis**
```
Pacote único com todos os produtos
Total do frete: R$ 25,00
```

#### **Vendedor: Loja XYZ**

**1. Entrega Expressa - 3 dias úteis (por item)**
```
Produto C (1 unidade): R$ 18,00
Total do frete: R$ 18,00
```

**2. Entrega Agrupada - 5 dias úteis**
```
Pacote único com todos os produtos
Total do frete: R$ 18,00
```

### Resumo das Opções

| Modalidade | Loja ABC | Loja XYZ | Total Frete | Prazo |
|------------|----------|----------|-------------|--------|
| Expressa | R$ 42,00 | R$ 18,00 | R$ 60,00 | 3 dias |
| Agrupada | R$ 25,00 | R$ 18,00 | R$ 43,00 | 5 dias |

**Economia escolhendo Agrupada: R$ 17,00** 💰

## Regras de Negócio

### Frete Grátis
- **Entrega Expressa**: Frete grátis acima de R$ 299,00 por vendedor
- **Entrega Agrupada**: Frete grátis acima de R$ 199,00 por vendedor

### Peso e Dimensões
- Peso máximo por pacote: 30kg
- Se exceder, o sistema divide automaticamente em múltiplos pacotes
- Peso cubado é considerado (volume/5000)

### Taxas Adicionais
- GRIS (Gerenciamento de Risco): aplicado sobre o valor da mercadoria
- Ad Valorem: seguro opcional
- Pedágio/Despacho: quando aplicável pela região

## Interface do Usuário

### No Carrinho
```svelte
<ShippingOptions seller="Loja ABC">
  <Option 
    name="Entrega Expressa - 3 dias úteis (por item)"
    price="42.00"
    description="Cada produto é enviado separadamente"
    highlight="Mais rápido"
  />
  <Option 
    name="Entrega Agrupada - 5 dias úteis" 
    price="25.00"
    description="Todos os produtos em um único pacote"
    highlight="Mais econômico"
    recommended
  />
</ShippingOptions>
```

### No Checkout
- Cliente escolhe a modalidade por vendedor
- Sistema calcula prazo máximo considerando todos os vendedores
- Exibe economia ao escolher opções agrupadas

## Benefícios

### Para o Cliente
- **Flexibilidade**: escolhe entre rapidez ou economia
- **Transparência**: vê exatamente como o frete é calculado
- **Economia**: pode economizar agrupando envios

### Para o Marketplace
- **Competitividade**: oferece opções variadas
- **Otimização**: reduz custos com envios agrupados
- **Satisfação**: cliente escolhe o que melhor atende sua necessidade

### Para o Vendedor
- **Eficiência**: pode agrupar pedidos do mesmo cliente
- **Redução de custos**: menos despachos individuais
- **Melhor margem**: em envios agrupados

## Configuração no Admin

### Por Modalidade
```sql
-- Entrega Expressa
UPDATE shipping_modalities 
SET 
  price_multiplier = 1.3,    -- 30% mais caro
  days_multiplier = 1.0,     -- Prazo normal
  pricing_type = 'per_item'  -- Cobra por item
WHERE id = 'expressa';

-- Entrega Agrupada  
UPDATE shipping_modalities
SET
  price_multiplier = 1.1,       -- 10% mais caro que o base
  days_multiplier = 1.3,        -- 30% mais prazo
  pricing_type = 'per_shipment' -- Cobra por remessa
WHERE id = 'agrupada';
```

### Por Vendedor
- Pode definir regras específicas de frete grátis
- Pode desabilitar modalidades
- Pode ajustar multiplicadores 