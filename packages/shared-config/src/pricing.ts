// Configurações centralizadas de preço
export const PRICING_CONFIG = {
  PIX_DISCOUNT_PERCENT: 5,
  INSTALLMENTS_DEFAULT: 12,
  INSTALLMENTS_MAX: 24, 
  MIN_INSTALLMENT_VALUE: 20,
  INTEREST_FREE_UP_TO: 2,
  INTEREST_RATE_MONTHLY: 2.99
} as const;

export function calculatePixPrice(price: number): number {
  return price * (1 - PRICING_CONFIG.PIX_DISCOUNT_PERCENT / 100);
}

export function calculateInstallments(price: number) {
  const options: Array<{
    number: number;
    value: number;
    hasInterest: boolean;
    label: string;
  }> = [];
  
  for (let i = 1; i <= PRICING_CONFIG.INSTALLMENTS_MAX; i++) {
    const value = price / i;
    if (value >= PRICING_CONFIG.MIN_INSTALLMENT_VALUE) {
      options.push({
        number: i,
        value,
        hasInterest: i > PRICING_CONFIG.INTEREST_FREE_UP_TO,
        label: i === 1 ? `À vista R$ ${value.toFixed(2)}` : 
               `${i}x de R$ ${value.toFixed(2)} ${i <= PRICING_CONFIG.INTEREST_FREE_UP_TO ? 'sem juros' : 'com juros'}`
      });
    }
  }
  return options;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
} 