# API Reference - Marketplace GDG

## Visão Geral

A API do Marketplace segue os princípios REST e retorna respostas em JSON. Todas as requisições devem incluir o header `Content-Type: application/json`.

## URL Base

```
Desenvolvimento: http://localhost:5173/api
Produção: https://api.marketplace.com/v1
```

## Autenticação

A API usa tokens JWT para autenticação. Inclua o token no header Authorization:

```
Authorization: Bearer <token>
```

## Formato de Resposta

### Sucesso
```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Erro
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensagem de erro legível",
    "details": {}
  }
}
```

## Endpoints

### Autenticação

#### POST /auth/register
Registra um novo usuário.

**Request Body:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123",
  "name": "Nome Completo",
  "phone": "11999999999"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "usuario@email.com",
      "name": "Nome Completo"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### POST /auth/login
Autentica um usuário existente.

**Request Body:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "usuario@email.com",
      "name": "Nome Completo",
      "role": "customer"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### POST /auth/logout
Faz logout do usuário atual.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logout realizado com sucesso"
  }
}
```

#### POST /auth/refresh
Renova o token de autenticação.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Produtos

#### GET /products
Lista produtos com paginação e filtros.

**Query Parameters:**
- `page` (number): Página atual (default: 1)
- `limit` (number): Itens por página (default: 20, max: 100)
- `search` (string): Busca por nome ou descrição
- `category` (string): ID da categoria
- `minPrice` (number): Preço mínimo
- `maxPrice` (number): Preço máximo
- `sortBy` (string): Campo para ordenação (name, price, created_at)
- `order` (string): Direção da ordenação (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prod_123",
      "name": "Produto Exemplo",
      "slug": "produto-exemplo",
      "description": "Descrição do produto",
      "price": 99.90,
      "images": ["url1", "url2"],
      "category": {
        "id": "cat_123",
        "name": "Eletrônicos"
      },
      "seller": {
        "id": "seller_123",
        "name": "Loja Exemplo"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

#### GET /products/:id
Retorna detalhes de um produto específico.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prod_123",
    "name": "Produto Exemplo",
    "slug": "produto-exemplo",
    "description": "Descrição completa do produto",
    "shortDescription": "Descrição curta",
    "price": 99.90,
    "compareAtPrice": 129.90,
    "images": ["url1", "url2", "url3"],
    "category": {
      "id": "cat_123",
      "name": "Eletrônicos",
      "slug": "eletronicos"
    },
    "brand": {
      "id": "brand_123",
      "name": "Marca X"
    },
    "seller": {
      "id": "seller_123",
      "name": "Loja Exemplo",
      "rating": 4.5
    },
    "attributes": {
      "cor": "Preto",
      "tamanho": "M"
    },
    "stockQuantity": 50,
    "rating": 4.2,
    "reviewCount": 23,
    "variants": [
      {
        "id": "var_123",
        "name": "Tamanho P - Preto",
        "price": 99.90,
        "stockQuantity": 10,
        "attributes": {
          "size": "P",
          "color": "Preto"
        }
      }
    ]
  }
}
```

#### POST /products
Cria um novo produto (requer autenticação de vendedor).

**Request Body:**
```json
{
  "name": "Novo Produto",
  "description": "Descrição do produto",
  "price": 149.90,
  "categoryId": "cat_123",
  "brandId": "brand_123",
  "images": ["url1", "url2"],
  "stockQuantity": 100,
  "attributes": {
    "cor": "Azul",
    "material": "Algodão"
  }
}
```

#### PUT /products/:id
Atualiza um produto existente (requer autenticação de vendedor).

#### DELETE /products/:id
Remove um produto (soft delete).

### Carrinho

#### GET /cart
Retorna o carrinho do usuário atual.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cart_123",
    "items": [
      {
        "id": "item_123",
        "product": {
          "id": "prod_123",
          "name": "Produto",
          "price": 99.90,
          "image": "url"
        },
        "quantity": 2,
        "price": 99.90,
        "total": 199.80
      }
    ],
    "itemsCount": 2,
    "subtotal": 199.80
  }
}
```

#### POST /cart/items
Adiciona item ao carrinho.

**Request Body:**
```json
{
  "productId": "prod_123",
  "variantId": "var_123",
  "quantity": 1
}
```

#### PUT /cart/items/:id
Atualiza quantidade de um item.

**Request Body:**
```json
{
  "quantity": 3
}
```

#### DELETE /cart/items/:id
Remove item do carrinho.

### Pedidos

#### GET /orders
Lista pedidos do usuário.

**Query Parameters:**
- `status`: Filtrar por status
- `page`: Página
- `limit`: Limite por página

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order_123",
      "orderNumber": "ORD-2024-0001",
      "status": "processing",
      "total": 299.80,
      "createdAt": "2024-01-15T10:00:00Z",
      "items": [
        {
          "productName": "Produto",
          "quantity": 2,
          "price": 99.90
        }
      ]
    }
  ]
}
```

#### GET /orders/:id
Detalhes de um pedido específico.

#### POST /orders
Cria um novo pedido.

**Request Body:**
```json
{
  "items": [
    {
      "productId": "prod_123",
      "variantId": "var_123",
      "quantity": 2
    }
  ],
  "shippingAddressId": "addr_123",
  "billingAddressId": "addr_123",
  "paymentMethod": "credit_card",
  "couponCode": "DESCONTO10"
}
```

### Endereços

#### GET /addresses
Lista endereços do usuário.

#### POST /addresses
Adiciona novo endereço.

**Request Body:**
```json
{
  "type": "shipping",
  "recipientName": "Nome Completo",
  "street": "Rua Exemplo",
  "number": "123",
  "complement": "Apto 45",
  "neighborhood": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01234-567",
  "phone": "11999999999",
  "isDefault": true
}
```

### Categorias

#### GET /categories
Lista todas as categorias.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_123",
      "name": "Eletrônicos",
      "slug": "eletronicos",
      "icon": "icon-url",
      "subcategories": [
        {
          "id": "cat_456",
          "name": "Smartphones",
          "slug": "smartphones"
        }
      ]
    }
  ]
}
```

### Vendedores

#### GET /sellers
Lista vendedores.

#### GET /sellers/:id
Detalhes de um vendedor.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "seller_123",
    "storeName": "Loja Exemplo",
    "storeSlug": "loja-exemplo",
    "description": "Descrição da loja",
    "logo": "logo-url",
    "banner": "banner-url",
    "rating": 4.5,
    "totalSales": 1234,
    "productsCount": 56
  }
}
```

### Avaliações

#### GET /products/:id/reviews
Lista avaliações de um produto.

#### POST /products/:id/reviews
Adiciona avaliação a um produto.

**Request Body:**
```json
{
  "rating": 5,
  "title": "Excelente produto",
  "comment": "Superou minhas expectativas",
  "images": ["url1", "url2"]
}
```

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| `VALIDATION_ERROR` | Dados inválidos na requisição |
| `UNAUTHORIZED` | Token ausente ou inválido |
| `FORBIDDEN` | Sem permissão para acessar recurso |
| `NOT_FOUND` | Recurso não encontrado |
| `CONFLICT` | Conflito (ex: email já cadastrado) |
| `RATE_LIMIT` | Limite de requisições excedido |
| `INTERNAL_ERROR` | Erro interno do servidor |

## Rate Limiting

- **Anônimo**: 100 requisições por hora
- **Autenticado**: 1000 requisições por hora
- **Headers de resposta**:
  - `X-RateLimit-Limit`: Limite total
  - `X-RateLimit-Remaining`: Requisições restantes
  - `X-RateLimit-Reset`: Timestamp do reset

## Webhooks

Veja [Documentação de Webhooks](./webhooks.md) para eventos disponíveis.

## SDKs

### JavaScript/TypeScript
```typescript
import { MarketplaceAPI } from '@marketplace/sdk';

const api = new MarketplaceAPI({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Buscar produtos
const products = await api.products.list({
  search: 'notebook',
  limit: 10
});

// Criar pedido
const order = await api.orders.create({
  items: [{ productId: 'prod_123', quantity: 1 }]
});
```

## Exemplos

### cURL
```bash
# Buscar produtos
curl -X GET "https://api.marketplace.com/v1/products?search=notebook" \
  -H "Accept: application/json"

# Criar pedido (autenticado)
curl -X POST "https://api.marketplace.com/v1/orders" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"prod_123","quantity":1}]}'
```

### JavaScript Fetch
```javascript
// Buscar produtos
const response = await fetch('https://api.marketplace.com/v1/products?category=eletronicos');
const data = await response.json();

// Adicionar ao carrinho
const response = await fetch('https://api.marketplace.com/v1/cart/items', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productId: 'prod_123',
    quantity: 1
  })
});
``` 