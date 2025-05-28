// Types relacionados a endereços e envio

export interface Address {
  id: string;
  user_id: string;
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimated_days: number;
  carrier?: string;
}

export interface ShippingCalculation {
  zip_code: string;
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  options: ShippingOption[];
}

export interface ShippingAddress extends Address {
  instructions?: string;
  receiver_name?: string;
  receiver_phone?: string;
} 