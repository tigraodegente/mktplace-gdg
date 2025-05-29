#!/bin/bash

echo "🧪 TESTANDO API DE FRETE AVANÇADO"
echo "=================================="

# Teste 1: CEP de São Paulo
echo "📍 Teste 1: CEP São Paulo (01310-100)"
curl -X POST http://localhost:5173/api/shipping/calculate-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "postal_code": "01310-100",
    "items": [
      {
        "product_id": "test-1",
        "quantity": 2,
        "weight": 0.5,
        "price": 50.00,
        "category_id": "cat-1"
      }
    ]
  }' | jq '.'

echo ""
echo "=================================="

# Teste 2: CEP do Rio de Janeiro
echo "📍 Teste 2: CEP Rio de Janeiro (20040-020)"
curl -X POST http://localhost:5173/api/shipping/calculate-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "postal_code": "20040-020",
    "items": [
      {
        "product_id": "test-2",
        "quantity": 1,
        "weight": 1.0,
        "price": 100.00,
        "category_id": "cat-2"
      }
    ]
  }' | jq '.'

echo ""
echo "=================================="

# Teste 3: Múltiplos itens
echo "📍 Teste 3: Múltiplos itens - Belo Horizonte"
curl -X POST http://localhost:5173/api/shipping/calculate-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "postal_code": "30112-000",
    "items": [
      {
        "product_id": "test-3",
        "quantity": 1,
        "weight": 0.3,
        "price": 25.00,
        "category_id": "cat-1"
      },
      {
        "product_id": "test-4",
        "quantity": 2,
        "weight": 0.8,
        "price": 75.00,
        "category_id": "cat-2"
      }
    ]
  }' | jq '.'

echo ""
echo "�� TESTES CONCLUÍDOS" 