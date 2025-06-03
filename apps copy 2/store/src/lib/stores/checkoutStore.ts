import { writable } from 'svelte/store';
import type { CheckoutState, CheckoutStep, Address, CheckoutValidation, Order, Payment } from '$lib/types/checkout';

const initialState: CheckoutState = {
  step: 'cart',
  items: [],
  address: null,
  paymentMethod: null,
  validation: null,
  order: null,
  payment: null,
  loading: false,
  error: null
};

function createCheckoutStore() {
  const { subscribe, set, update } = writable<CheckoutState>(initialState);

  return {
    subscribe,
    
    // Actions
    initialize: () => {
      set(initialState);
    },
    
    setStep: (step: CheckoutStep) => {
      update(state => ({ ...state, step }));
    },
    
    setAddress: (address: Address) => {
      update(state => ({ ...state, address }));
    },
    
    setPaymentMethod: (method: string) => {
      update(state => ({ ...state, paymentMethod: method }));
    },
    
    setValidation: (validation: CheckoutValidation) => {
      update(state => ({ ...state, validation }));
    },
    
    setOrderResult: (result: { order: Order; payment: Payment }) => {
      update(state => ({ 
        ...state, 
        order: result.order, 
        payment: result.payment 
      }));
    },
    
    setLoading: (loading: boolean) => {
      update(state => ({ ...state, loading }));
    },
    
    setError: (error: string | null) => {
      update(state => ({ ...state, error }));
    },
    
    reset: () => {
      set(initialState);
    }
  };
}

export const checkoutStore = createCheckoutStore(); 