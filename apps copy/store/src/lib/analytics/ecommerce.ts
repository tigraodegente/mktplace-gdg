// Enhanced Ecommerce Analytics para Google Analytics 4
export class EcommerceAnalytics {
  
  static trackPurchase(orderData: {
    transaction_id: string;
    value: number;
    currency: string;
    tax?: number;
    shipping?: number;
    items: Array<{
      item_id: string;
      item_name: string;
      category: string;
      quantity: number;
      price: number;
      currency?: string;
    }>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'purchase', {
        transaction_id: orderData.transaction_id,
        value: orderData.value,
        currency: orderData.currency,
        tax: orderData.tax || 0,
        shipping: orderData.shipping || 0,
        items: orderData.items
      });
      
      console.log('📊 Purchase tracked:', orderData.transaction_id);
    }
  }
  
  static trackAddToCart(item: {
    currency: string;
    value: number;
    items: Array<{
      item_id: string;
      item_name: string;
      category: string;
      quantity: number;
      price: number;
    }>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_cart', item);
      console.log('🛒 Add to cart tracked:', item.items[0]?.item_name);
    }
  }
  
  static trackRemoveFromCart(item: {
    currency: string;
    value: number;
    items: Array<{
      item_id: string;
      item_name: string;
      category: string;
      quantity: number;
      price: number;
    }>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'remove_from_cart', item);
      console.log('🗑️ Remove from cart tracked:', item.items[0]?.item_name);
    }
  }
  
  static trackViewItem(item: {
    currency: string;
    value: number;
    items: Array<{
      item_id: string;
      item_name: string;
      category: string;
      price: number;
    }>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'view_item', item);
      console.log('👁️ View item tracked:', item.items[0]?.item_name);
    }
  }
  
  static trackBeginCheckout(data: {
    currency: string;
    value: number;
    items: Array<any>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'begin_checkout', data);
      console.log('🛒 Begin checkout tracked, value:', data.value);
    }
  }
  
  static trackSearch(searchTerm: string, numberOfResults?: number) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'search', {
        search_term: searchTerm,
        number_of_results: numberOfResults
      });
      console.log('🔍 Search tracked:', searchTerm);
    }
  }
  
  static trackAddToWishlist(item: {
    currency: string;
    value: number;
    items: Array<{
      item_id: string;
      item_name: string;
      category: string;
      price: number;
    }>;
  }) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_wishlist', item);
      console.log('❤️ Add to wishlist tracked:', item.items[0]?.item_name);
    }
  }
}

// Declaração de tipos para gtag
declare global {
  function gtag(...args: any[]): void;
}
