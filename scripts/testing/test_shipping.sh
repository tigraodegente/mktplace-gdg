#!/bin/bash

echo "🚀 Testando Sistema Universal de Frete"
echo "======================================="

# Testar API simples primeiro
echo "1. Testando conexão básica..."
curl -s -X POST http://localhost:5173/api/shipping/test \
  -H "Content-Type: application/json" \
  -d '{"postalCode": "01310100"}' | jq '.data.carriers, .data.zones, .data.rates'

echo ""
echo "2. Testando cálculo de frete para SP (produto 200g, R$ 299.99)..."
curl -s -X POST http://localhost:5173/api/shipping/calculate-simple \
  -H "Content-Type: application/json" \
  -d '{
    "postalCode": "01310-100",
    "items": [{
      "product": {
        "id": "test-product-1", 
        "name": "iPhone 15 Pro", 
        "price": 299.99, 
        "weight": 0.2
      }, 
      "quantity": 1, 
      "sellerId": "seller-1"
    }]
  }' | jq '.data'

echo ""
echo "3. Testando com produto que deveria ter frete grátis..."
curl -s -X POST http://localhost:5173/api/shipping/calculate-simple \
  -H "Content-Type: application/json" \
  -d '{
    "postalCode": "01310-100",
    "items": [{
      "product": {
        "id": "iphone-15-pro", 
        "name": "iPhone 15 Pro Especial", 
        "price": 199.99, 
        "weight": 0.2
      }, 
      "quantity": 1, 
      "sellerId": "seller-1"
    }]
  }' | jq '.data.options[0] | {name, price, isFree, freeReason}'

echo ""
echo "4. Testando para RJ (produto 500g)..."
curl -s -X POST http://localhost:5173/api/shipping/calculate-simple \
  -H "Content-Type: application/json" \
  -d '{
    "postalCode": "20040-020",
    "items": [{
      "product": {
        "id": "test-product-2", 
        "name": "Produto Teste", 
        "price": 150.00, 
        "weight": 0.5
      }, 
      "quantity": 1, 
      "sellerId": "seller-1"
    }]
  }' | jq '.data.options[0] | {name, price, deliveryDaysMin, deliveryDaysMax}'

echo ""
echo "✅ Testes concluídos!" 