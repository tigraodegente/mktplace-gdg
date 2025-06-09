// Definir filtro para produtos vendáveis
console.log('🔍 Definindo critérios para produtos vendáveis...')

const sellableFilter = {
  $and: [
    // Deve estar ativo
    { isactive: true },
    
    // Deve ter estoque
    {
      $or: [
        { realstock: { $gt: 0 } },
        { virtualstock: { $gt: 0 } }
      ]
    },
    
    // Deve ter preço
    { price: { $gt: 0 } },
    
    // Deve ter nome
    { productname: { $exists: true, $ne: '' } },
    
    // NÃO deve estar oculto ou não-vendável
    { hideinlist: { $ne: true } },
    { hideinsearch: { $ne: true } },
    { notSalable: { $ne: true } }
  ]
} 