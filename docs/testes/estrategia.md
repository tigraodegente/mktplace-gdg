# Estratégia de Testes - Marketplace GDG

## Visão Geral

Este documento define a estratégia de testes para garantir a qualidade, confiabilidade e performance do Marketplace GDG. Seguimos a pirâmide de testes com foco em automação e cobertura adequada.

## Pirâmide de Testes

```
         /\
        /E2E\        (5-10%)
       /------\
      /Integração\   (20-30%)
     /------------\
    /   Unitários  \ (60-70%)
   /________________\
```

## Tipos de Testes

### 1. Testes Unitários

**Objetivo**: Testar unidades isoladas de código (funções, classes, componentes).

**Ferramentas**:
- **Vitest**: Framework de testes para JavaScript/TypeScript
- **Testing Library**: Para testes de componentes Svelte
- **MSW**: Mock de APIs

**O que testar**:
- Funções utilitárias
- Lógica de negócio
- Stores
- Componentes isolados
- Validações
- Formatadores

**Exemplo**:
```typescript
// src/lib/utils/cart.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCartTotal, applyDiscount } from './cart';

describe('calculateCartTotal', () => {
  it('should calculate total correctly', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 }
    ];
    
    expect(calculateCartTotal(items)).toBe(250);
  });
  
  it('should return 0 for empty cart', () => {
    expect(calculateCartTotal([])).toBe(0);
  });
});

describe('applyDiscount', () => {
  it('should apply percentage discount', () => {
    expect(applyDiscount(100, { type: 'percentage', value: 10 })).toBe(90);
  });
  
  it('should apply fixed discount', () => {
    expect(applyDiscount(100, { type: 'fixed', value: 20 })).toBe(80);
  });
  
  it('should not return negative values', () => {
    expect(applyDiscount(50, { type: 'fixed', value: 100 })).toBe(0);
  });
});
```

### 2. Testes de Integração

**Objetivo**: Testar a integração entre diferentes partes do sistema.

**Ferramentas**:
- **Vitest**: Para testes de API
- **Supertest**: Para requisições HTTP
- **Docker**: Para banco de dados de teste

**O que testar**:
- Endpoints de API
- Integração com banco de dados
- Fluxos de autenticação
- Serviços externos (mockados)

**Exemplo**:
```typescript
// src/routes/api/products/products.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase, cleanupDatabase } from '$lib/test-utils';

describe('Products API', () => {
  beforeAll(async () => {
    await createTestDatabase();
  });
  
  afterAll(async () => {
    await cleanupDatabase();
  });
  
  describe('GET /api/products', () => {
    it('should return products with pagination', async () => {
      const response = await fetch('/api/products?page=1&limit=10');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number)
      });
    });
    
    it('should filter by category', async () => {
      const response = await fetch('/api/products?category=electronics');
      const data = await response.json();
      
      expect(data.data.every(p => p.category.slug === 'electronics')).toBe(true);
    });
  });
  
  describe('POST /api/products', () => {
    it('should create product with valid data', async () => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-seller-token'
        },
        body: JSON.stringify({
          name: 'Test Product',
          price: 99.90,
          categoryId: 'cat_123'
        })
      });
      
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.name).toBe('Test Product');
    });
    
    it('should reject invalid data', async () => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-seller-token'
        },
        body: JSON.stringify({
          name: 'X', // Nome muito curto
          price: -10 // Preço negativo
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

### 3. Testes E2E (End-to-End)

**Objetivo**: Testar fluxos completos do usuário.

**Ferramentas**:
- **Playwright**: Automação de browser
- **Cypress**: Alternativa para E2E

**O que testar**:
- Fluxos críticos de negócio
- Jornadas do usuário
- Integrações com serviços externos
- Compatibilidade entre browsers

**Exemplo**:
```typescript
// tests/e2e/purchase-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Purchase Flow', () => {
  test('should complete purchase as logged user', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Buscar produto
    await page.fill('input[name="search"]', 'notebook');
    await page.press('input[name="search"]', 'Enter');
    
    // Selecionar produto
    await page.click('text=Notebook Gamer XYZ');
    await expect(page).toHaveURL(/\/produtos\/notebook-gamer-xyz/);
    
    // Adicionar ao carrinho
    await page.click('button:has-text("Adicionar ao Carrinho")');
    await expect(page.locator('.cart-count')).toHaveText('1');
    
    // Ir para checkout
    await page.goto('/carrinho');
    await page.click('button:has-text("Finalizar Compra")');
    
    // Selecionar endereço e pagamento
    await page.click('input[value="addr_123"]');
    await page.click('input[value="credit_card"]');
    
    // Preencher dados do cartão
    await page.fill('input[name="cardNumber"]', '4111111111111111');
    await page.fill('input[name="cardName"]', 'Test User');
    await page.fill('input[name="cardExpiry"]', '12/25');
    await page.fill('input[name="cardCvv"]', '123');
    
    // Confirmar pedido
    await page.click('button:has-text("Confirmar Pedido")');
    
    // Verificar sucesso
    await expect(page).toHaveURL('/checkout/sucesso');
    await expect(page.locator('h1')).toContainText('Pedido Confirmado');
    await expect(page.locator('.order-number')).toBeVisible();
  });
  
  test('should handle out of stock scenario', async ({ page }) => {
    await page.goto('/produtos/produto-sem-estoque');
    
    const addButton = page.locator('button:has-text("Adicionar ao Carrinho")');
    await expect(addButton).toBeDisabled();
    await expect(page.locator('.stock-status')).toContainText('Sem estoque');
  });
});
```

## Cobertura de Código

### Metas de Cobertura

| Tipo | Meta | Mínimo Aceitável |
|------|------|------------------|
| Statements | 80% | 70% |
| Branches | 75% | 65% |
| Functions | 80% | 70% |
| Lines | 80% | 70% |

### Configuração

```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts'
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    }
  }
});
```

## Testes de Performance

### Ferramentas
- **Lighthouse CI**: Performance de páginas
- **k6**: Testes de carga
- **Web Vitals**: Métricas de UX

### Exemplo de Teste de Carga
```javascript
// tests/load/checkout.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requisições < 500ms
    http_req_failed: ['rate<0.1'],    // Taxa de erro < 10%
  },
};

export default function () {
  // Login
  const loginRes = http.post('https://api.marketplace.com/auth/login', {
    email: 'test@example.com',
    password: 'password123'
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });
  
  const token = loginRes.json('data.token');
  
  // Criar pedido
  const orderRes = http.post(
    'https://api.marketplace.com/orders',
    JSON.stringify({
      items: [{ productId: 'prod_123', quantity: 1 }]
    }),
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  check(orderRes, {
    'order created': (r) => r.status === 201,
    'order has id': (r) => r.json('data.id') !== undefined,
  });
  
  sleep(1);
}
```

## Testes de Segurança

### Checklist
- [ ] SQL Injection
- [ ] XSS (Cross-Site Scripting)
- [ ] CSRF (Cross-Site Request Forgery)
- [ ] Authentication bypass
- [ ] Authorization flaws
- [ ] Sensitive data exposure
- [ ] Rate limiting

### Exemplo
```typescript
// tests/security/sql-injection.test.ts
describe('SQL Injection Prevention', () => {
  it('should handle malicious input in search', async () => {
    const maliciousInput = "'; DROP TABLE products; --";
    const response = await fetch(`/api/products?search=${encodeURIComponent(maliciousInput)}`);
    
    expect(response.status).toBe(200);
    // Verificar que a tabela ainda existe
    const checkResponse = await fetch('/api/products');
    expect(checkResponse.status).toBe(200);
  });
});
```

## Ambiente de Testes

### Configuração Local
```bash
# .env.test
DATABASE_URL=postgresql://test:test@localhost:5432/marketplace_test
XATA_API_KEY=test_key
NODE_ENV=test
```

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: marketplace_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install
      
      - name: Run unit tests
        run: pnpm test:unit
      
      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/marketplace_test
      
      - name: Run E2E tests
        run: pnpm test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Mocking e Fixtures

### Dados de Teste
```typescript
// tests/fixtures/products.ts
export const mockProduct = {
  id: 'prod_123',
  name: 'Test Product',
  slug: 'test-product',
  price: 99.90,
  description: 'Test description',
  images: ['https://example.com/image.jpg'],
  category: {
    id: 'cat_123',
    name: 'Electronics',
    slug: 'electronics'
  },
  seller: {
    id: 'seller_123',
    name: 'Test Store'
  }
};

export const createMockProduct = (overrides = {}) => ({
  ...mockProduct,
  ...overrides,
  id: `prod_${Date.now()}`
});
```

### Mock de Serviços
```typescript
// tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/products', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [mockProduct],
        meta: { page: 1, limit: 20, total: 1 }
      })
    );
  }),
  
  rest.post('/api/orders', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: 'order_123',
          orderNumber: 'ORD-2024-0001',
          status: 'pending'
        }
      })
    );
  })
];
```

## Relatórios e Monitoramento

### Dashboard de Testes
- Cobertura de código
- Taxa de sucesso/falha
- Tempo de execução
- Tendências ao longo do tempo

### Notificações
- Falhas em CI/CD
- Queda na cobertura
- Testes lentos
- Testes instáveis (flaky)

## Best Practices

### 1. Testes Independentes
Cada teste deve ser independente e não depender de outros.

### 2. Nomenclatura Clara
```typescript
// ✅ BOM
it('should return 404 when product does not exist')

// ❌ RUIM
it('test product not found')
```

### 3. AAA Pattern
```typescript
it('should calculate discount correctly', () => {
  // Arrange
  const price = 100;
  const discountPercentage = 10;
  
  // Act
  const result = calculateDiscount(price, discountPercentage);
  
  // Assert
  expect(result).toBe(90);
});
```

### 4. Evite Testes Frágeis
- Use seletores estáveis (data-testid)
- Evite delays fixos, use waitFor
- Mock dependências externas

### 5. Testes Rápidos
- Mantenha testes unitários < 50ms
- Use banco em memória para integração
- Parallelize execução quando possível

## Comandos

```bash
# Executar todos os testes
pnpm test

# Testes unitários com watch
pnpm test:unit --watch

# Testes de integração
pnpm test:integration

# Testes E2E
pnpm test:e2e

# Testes E2E com UI
pnpm test:e2e --ui

# Cobertura
pnpm test:coverage

# Testes de um arquivo específico
pnpm test src/lib/utils/cart.test.ts

# Testes com filtro
pnpm test --grep "should calculate"
``` 