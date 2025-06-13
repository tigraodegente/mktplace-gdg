// Address Types - Tipos unificados para endereços

import type { TimestampFields } from '../common';

export interface Address extends TimestampFields {
  id: string;
  user_id?: string;
  
  // Dados do destinatário
  name: string;
  document?: string; // CPF/CNPJ
  
  // Endereço
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  
  // Referência e observações
  reference?: string;
  notes?: string;
  
  // Configurações
  is_default: boolean;
  is_active: boolean;
  label?: string; // Ex: "Casa", "Trabalho", "Apartamento da vovó"
  
  // Dados de contato para entrega
  phone?: string;
  email?: string;
  
  // Coordenadas (para cálculo de frete mais preciso)
  latitude?: number;
  longitude?: number;
  
  // Validação
  is_validated: boolean;
  validation_source?: 'cep' | 'google' | 'manual';
}

// Tipo simplificado para formulários
export interface AddressForm {
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
  reference?: string;
}

// Estados brasileiros
export type BrazilianState = 
  | 'AC' | 'AL' | 'AP' | 'AM' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' 
  | 'MA' | 'MT' | 'MS' | 'MG' | 'PA' | 'PB' | 'PR' | 'PE' | 'PI' 
  | 'RJ' | 'RN' | 'RS' | 'RO' | 'RR' | 'SC' | 'SP' | 'SE' | 'TO';

// Validação de CEP
export interface CepValidation {
  cep: string;
  street?: string;
  neighborhood?: string;
  city: string;
  state: string;
  is_valid: boolean;
  source: 'viacep' | 'correios' | 'custom';
}

// Endereço para cálculo de frete
export interface ShippingAddress {
  zip_code: string;
  city: string;
  state: string;
  country: string;
} 