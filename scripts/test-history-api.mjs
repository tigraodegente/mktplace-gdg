#!/usr/bin/env node

// Testar API de histórico
const productId = 'c6b3d5de-4b56-4a9a-92b9-842f0b15f0b2' // ID real do banco

console.log(`🧪 Testando API de histórico para produto: ${productId}`)

try {
  const response = await fetch(`http://localhost:5173/api/products/${productId}/history`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Simular um token JWT válido (você precisará de um token real)
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  })
  
  console.log('📡 Status:', response.status)
  
  if (!response.ok) {
    console.log('❌ Erro HTTP:', response.statusText)
    const errorText = await response.text()
    console.log('📄 Response body:', errorText)
  } else {
    const data = await response.json()
    console.log('✅ Resposta:', JSON.stringify(data, null, 2))
  }
  
} catch (error) {
  console.error('❌ Erro de rede:', error.message)
} 