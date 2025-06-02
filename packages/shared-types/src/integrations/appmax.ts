// Tipos para integração com AppMax Payment Gateway

export interface AppmaxConfig {
  apiKey: string;
  environment: 'production' | 'sandbox';
  webhookSecret?: string;
}

export interface AppmaxCustomer {
  id?: string;
  email: string;
  name: string;
  document: string; // CPF ou CNPJ
  phone?: string;
  birthDate?: string;
  address?: AppmaxAddress;
}

export interface AppmaxAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface AppmaxOrderItem {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  price: number; // em centavos
  sku?: string;
}

export interface AppmaxOrder {
  id?: string;
  customerId: string;
  items: AppmaxOrderItem[];
  shipping?: AppmaxShipping;
  discount?: number;
  total: number; // em centavos
  metadata?: Record<string, any>;
}

export interface AppmaxShipping {
  method: string;
  carrier?: string;
  price: number; // em centavos
  estimatedDelivery?: string;
  address: AppmaxAddress;
}

export interface AppmaxPayment {
  id?: string;
  orderId: string;
  method: 'credit_card' | 'debit_card' | 'pix' | 'boleto';
  amount: number; // em centavos
  installments?: number;
  card?: AppmaxCard;
  pix?: AppmaxPix;
  boleto?: AppmaxBoleto;
  metadata?: Record<string, any>;
}

export interface AppmaxCard {
  number?: string; // Apenas para primeiro pagamento
  token?: string; // Para pagamentos com cartão tokenizado
  holder: string;
  expiry: string; // MM/YY
  cvv?: string;
  brand?: string;
}

export interface AppmaxPix {
  expiresIn?: number; // segundos
  qrCode?: string;
  qrCodeUrl?: string;
  paymentUrl?: string;
}

export interface AppmaxBoleto {
  dueDate: string;
  instructions?: string;
  barcodeUrl?: string;
  bankSlipUrl?: string;
}

export interface AppmaxPaymentResponse {
  success: boolean;
  payment?: {
    id: string;
    status: AppmaxPaymentStatus;
    method: string;
    amount: number;
    createdAt: string;
    paidAt?: string;
    pix?: AppmaxPix;
    boleto?: AppmaxBoleto;
    card?: {
      brand: string;
      lastDigits: string;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export type AppmaxPaymentStatus = 
  | 'pending'
  | 'processing'
  | 'approved'
  | 'declined'
  | 'refunded'
  | 'cancelled'
  | 'expired';

export interface AppmaxWebhookPayload {
  id: string;
  event: AppmaxWebhookEvent;
  data: {
    payment?: AppmaxPayment & { status: AppmaxPaymentStatus };
    order?: AppmaxOrder;
    customer?: AppmaxCustomer;
  };
  createdAt: string;
  signature?: string;
}

export type AppmaxWebhookEvent = 
  | 'payment.approved'
  | 'payment.declined'
  | 'payment.refunded'
  | 'payment.cancelled'
  | 'order.created'
  | 'order.updated'
  | 'customer.created'
  | 'customer.updated';

export interface AppmaxRefund {
  paymentId: string;
  amount?: number; // Parcial se especificado, total se omitido
  reason?: string;
}

export interface AppmaxTokenizeCard {
  customerId: string;
  card: {
    number: string;
    holder: string;
    expiry: string;
    cvv: string;
  };
}

export interface AppmaxCardToken {
  token: string;
  brand: string;
  lastDigits: string;
  expiryMonth: string;
  expiryYear: string;
} 