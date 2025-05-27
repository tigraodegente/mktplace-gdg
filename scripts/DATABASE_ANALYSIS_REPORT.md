# Análise Completa do Banco de Dados - Marketplace GDG

## 📊 Resumo Geral

**Total de Tabelas**: 17
**Tabelas com Dados**: 8
**Tabelas Vazias**: 9

## 🗂️ Análise Detalhada por Categoria

### 1. USUÁRIOS E AUTENTICAÇÃO

#### ✅ **`users`** (175 registros)
- **Função**: Tabela principal de usuários
- **Contém**: email, senha, nome, telefone, tipo (admin/seller/customer)
- **Status**: MANTER - Essencial
- **Relacionamentos**: sellers, orders, reviews, addresses

#### ✅ **`sellers`** (174 registros)
- **Função**: Dados específicos de vendedores
- **Contém**: nome_loja, CNPJ, comissão, dados bancários
- **Status**: MANTER - Essencial para marketplace
- **Relacionamentos**: users (1:1), products (1:N)

#### ⚠️ **`addresses`** (0 registros)
- **Função**: Endereços de entrega/cobrança
- **Status**: MANTER - Será usado quando houver pedidos
- **Sugestão**: Adicionar campos para tipo (entrega/cobrança), principal (boolean)

### 2. CATÁLOGO DE PRODUTOS

#### ✅ **`products`** (11.563 registros)
- **Função**: Catálogo principal
- **Status**: MANTER - Core do sistema
- **Melhorias Aplicadas**: 
  - ✅ Renomeado compare_at_price → original_price
  - ✅ Adicionado featuring (JSONB)
  - ✅ Removido supplier_id

#### ✅ **`product_variants`** (15 registros)
- **Função**: Variações (cor, tamanho)
- **Status**: MANTER - Essencial para e-commerce
- **Observação**: Apenas 5 produtos têm variantes - expandir uso

#### ✅ **`product_options`** (10 registros)
- **Função**: Tipos de opções (Cor, Tamanho)
- **Status**: MANTER - Parte do sistema de variantes

#### ✅ **`product_option_values`** (30 registros)
- **Função**: Valores das opções (Azul, P, M, G)
- **Status**: MANTER - Parte do sistema de variantes

#### ✅ **`variant_option_values`** (associativa)
- **Função**: Liga variantes aos valores
- **Status**: MANTER - Essencial para variantes

#### ✅ **`product_images`** (1.097 registros)
- **Função**: Imagens dos produtos
- **Status**: MANTER - Essencial
- **Problema**: Apenas 9.5% dos produtos têm imagens

#### ✅ **`categories`** (3 registros)
- **Função**: Categorias de produtos
- **Status**: MANTER mas MELHORAR
- **Problemas**: 
  - Apenas 3 categorias genéricas
  - Não usa hierarquia (parent_id)
- **Sugestão**: Criar subcategorias específicas

#### ✅ **`brands`** (158 registros)
- **Função**: Marcas dos produtos
- **Status**: MANTER - Importante para filtros

### 3. PEDIDOS E CARRINHO

#### ⚠️ **`orders`** (0 registros)
- **Função**: Pedidos realizados
- **Status**: MANTER - Essencial quando loja abrir
- **Campos necessários**: status, pagamento, frete, cupom

#### ⚠️ **`order_items`** (0 registros)
- **Função**: Itens de cada pedido
- **Status**: MANTER - Essencial para pedidos

#### ⚠️ **`cart_items`** (0 registros)
- **Função**: Carrinho temporário
- **Status**: MANTER - Essencial para UX
- **Sugestão**: Adicionar session_id para carrinho anônimo

### 4. ANALYTICS E MÉTRICAS

#### ✅ **`product_analytics`** (1.946.256 registros)
- **Função**: Eventos de interação
- **Status**: MANTER - Valioso para insights
- **Tipos**: view, sale, cart_add, wishlist_add

#### ✅ **`product_metrics`** (view materializada)
- **Função**: Métricas agregadas
- **Status**: MANTER - Performance

#### ✅ **`product_price_history`** (tabela)
- **Função**: Histórico de preços
- **Status**: MANTER - Compliance e análise

### 5. AVALIAÇÕES

#### ⚠️ **`product_reviews`** (0 registros)
- **Função**: Avaliações de produtos
- **Status**: MANTER - Importante para conversão
- **Estrutura**: Completa com imagens, resposta vendedor

## 🚨 Problemas Identificados

### 1. **Tabelas Vazias mas Necessárias**
- `orders`, `order_items`, `cart_items` - Essenciais quando abrir
- `addresses` - Necessário para entregas
- `product_reviews` - Importante para trust

### 2. **Redundâncias Encontradas**
- ✅ `suppliers` - JÁ REMOVIDA (era redundante com sellers)
- `view_count`, `sales_count` em products - Migrado para analytics
- `rating_average`, `rating_count` em products - Deve usar product_reviews

### 3. **Tabelas Faltando**

#### 🆕 **`coupons`** (CRIAR)
```sql
CREATE TABLE coupons (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    discount_type VARCHAR(20), -- 'percentage', 'fixed'
    discount_value DECIMAL(10,2),
    minimum_value DECIMAL(10,2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

#### 🆕 **`wishlists`** (CRIAR)
```sql
CREATE TABLE wishlists (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id, variant_id)
);
```

#### 🆕 **`shipping_methods`** (CRIAR)
```sql
CREATE TABLE shipping_methods (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    carrier VARCHAR(50), -- 'correios', 'transportadora'
    estimated_days INTEGER,
    base_cost DECIMAL(10,2),
    cost_per_kg DECIMAL(10,2),
    max_weight DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true
);
```

#### 🆕 **`payment_methods`** (CRIAR)
```sql
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(50), -- 'credit_card', 'pix', 'boleto'
    gateway VARCHAR(50), -- 'stripe', 'mercadopago'
    configuration JSONB,
    is_active BOOLEAN DEFAULT true
);
```

#### 🆕 **`notifications`** (CRIAR)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(50), -- 'order', 'payment', 'shipping'
    title VARCHAR(255),
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 📋 Plano de Ação

### Prioridade Alta
1. ✅ Remover `suppliers` - CONCLUÍDO
2. ⬜ Criar subcategorias específicas
3. ⬜ Implementar tabelas de cupons e frete
4. ⬜ Popular product_images (90% sem imagem)

### Prioridade Média
1. ⬜ Criar sistema de wishlist
2. ⬜ Implementar notificações
3. ⬜ Expandir uso de variantes
4. ⬜ Ativar sistema de reviews

### Prioridade Baixa
1. ⬜ Remover campos obsoletos de products
2. ⬜ Otimizar índices
3. ⬜ Criar mais views materializadas

## 🎯 Resumo das Recomendações

### Tabelas para MANTER
- Todas as 17 tabelas atuais são necessárias

### Tabelas para CRIAR
1. `coupons` - Sistema de descontos
2. `wishlists` - Lista de desejos
3. `shipping_methods` - Métodos de entrega
4. `payment_methods` - Formas de pagamento
5. `notifications` - Sistema de notificações

### Melhorias Urgentes
1. Adicionar mais categorias (atual: 3 → ideal: 50+)
2. Upload de imagens (90% dos produtos sem foto)
3. Criar variantes para mais produtos
4. Popular endereços dos usuários

## 📊 Métricas de Saúde do Banco

- **Produtos ativos**: 11.563 ✅
- **Produtos com imagem**: 1.097 (9.5%) ❌
- **Produtos com variantes**: 5 (0.04%) ❌
- **Categorias**: 3 (muito pouco) ❌
- **Vendedores ativos**: 174 ✅
- **Analytics funcionando**: 1.9M eventos ✅ 