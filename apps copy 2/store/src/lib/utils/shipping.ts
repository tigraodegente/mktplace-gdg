// Funções utilitárias de shipping - Safe for client

/**
 * Validar CEP
 */
export function validatePostalCode(postalCode: string): boolean {
  const clean = postalCode.replace(/\D/g, '');
  return clean.length === 8;
}

/**
 * Formatar CEP
 */
export function formatPostalCode(postalCode: string): string {
  const clean = postalCode.replace(/\D/g, '');
  if (clean.length >= 5) {
    return clean.replace(/(\d{5})(\d{1,3})/, '$1-$2');
  }
  return clean;
} 