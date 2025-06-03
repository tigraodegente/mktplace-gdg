/**
 * Utilitários de máscaras para inputs
 */

/**
 * Remove todos os caracteres não numéricos
 */
export function onlyNumbers(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Máscara de CPF: 000.000.000-00
 */
export function cpfMask(value: string): string {
  const numbers = onlyNumbers(value);
  
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  if (numbers.length <= 11) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

/**
 * Máscara de CNPJ: 00.000.000/0000-00
 */
export function cnpjMask(value: string): string {
  const numbers = onlyNumbers(value);
  
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  if (numbers.length <= 14) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
  
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
}

/**
 * Máscara de telefone: (00) 0000-0000 ou (00) 00000-0000
 */
export function phoneMask(value: string): string {
  const numbers = onlyNumbers(value);
  
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  
  // Celular com 9 dígitos
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }
  
  // Telefone fixo com 8 dígitos
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  }
  
  // Default para celular
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * Máscara de CEP: 00000-000
 */
export function cepMask(value: string): string {
  const numbers = onlyNumbers(value);
  
  if (numbers.length <= 5) return numbers;
  if (numbers.length <= 8) return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
  
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
}

/**
 * Máscara de data: 00/00/0000
 */
export function dateMask(value: string): string {
  const numbers = onlyNumbers(value);
  
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
  
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
}

/**
 * Máscara de cartão de crédito: 0000 0000 0000 0000
 */
export function creditCardMask(value: string): string {
  const numbers = onlyNumbers(value);
  const groups = [];
  
  for (let i = 0; i < numbers.length; i += 4) {
    groups.push(numbers.slice(i, i + 4));
  }
  
  return groups.slice(0, 4).join(' ');
}

/**
 * Máscara de moeda: R$ 0.000,00
 */
export function currencyMask(value: string): string {
  const numbers = onlyNumbers(value);
  
  if (!numbers) return '';
  
  // Converte para número e formata
  const amount = parseInt(numbers) / 100;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

/**
 * Máscara de porcentagem: 00,00%
 */
export function percentageMask(value: string): string {
  const numbers = onlyNumbers(value);
  
  if (!numbers) return '';
  
  // Limita a 10000 (100,00%)
  const limited = Math.min(parseInt(numbers), 10000);
  const percentage = limited / 100;
  
  return `${percentage.toFixed(2).replace('.', ',')}%`;
}

/**
 * Aplica máscara em tempo real no input
 */
export function applyMask(
  value: string,
  mask: (value: string) => string
): string {
  return mask(value);
}

/**
 * Remove máscara e retorna apenas números
 */
export function removeMask(value: string): string {
  return onlyNumbers(value);
}

/**
 * Cria um handler de input com máscara
 */
export function createMaskHandler(mask: (value: string) => string) {
  return (event: Event) => {
    const input = event.target as HTMLInputElement;
    const cursorPosition = input.selectionStart || 0;
    const oldValue = input.value;
    const newValue = mask(input.value);
    
    input.value = newValue;
    
    // Ajusta a posição do cursor
    if (newValue.length > oldValue.length) {
      input.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
    } else {
      input.setSelectionRange(cursorPosition, cursorPosition);
    }
  };
}

/**
 * Action do Svelte para aplicar máscara
 */
export function maskAction(node: HTMLInputElement, mask: (value: string) => string) {
  function handleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = mask(input.value);
  }
  
  node.addEventListener('input', handleInput);
  
  // Aplica máscara inicial se houver valor
  if (node.value) {
    node.value = mask(node.value);
  }
  
  return {
    destroy() {
      node.removeEventListener('input', handleInput);
    }
  };
} 