/**
 * Analytics Service
 * 
 * Tracking de eventos para otimização do marketplace
 * Integração futura com Google Analytics, Facebook Pixel, etc.
 */

import type { Product } from '@mktplace/shared-types';
import { dev } from '$app/environment';

export interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  ecommerce?: EcommerceData;
  user_properties?: Record<string, any>;
  custom_parameters?: Record<string, any>;
}

export interface EcommerceData {
  currency?: string;
  transaction_id?: string;
  value?: number;
  items?: EcommerceItem[];
  coupon?: string;
  shipping?: number;
  tax?: number;
}

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_category2?: string;
  item_brand?: string;
  item_variant?: string;
  price: number;
  quantity: number;
  currency?: string;
}

class AnalyticsService {
  private isEnabled = true;
  private userId: string | null = null;
  private sessionId: string;
  
  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupPageTracking();
  }
  
  // ===== Configuration =====
  
  setUserId(userId: string | null) {
    this.userId = userId;
  }
  
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
  
  // ===== Event Tracking =====
  
  async track(event: AnalyticsEvent) {
    if (!this.isEnabled) return;
    
    const enrichedEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      user_id: this.userId,
      page_url: window.location.href,
      page_title: document.title,
      user_agent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    // Send to multiple analytics providers
    await Promise.allSettled([
      this.sendToGA4(enrichedEvent),
      this.sendToInternalAnalytics(enrichedEvent),
      this.sendToPixel(enrichedEvent)
    ]);
    
    // Log for debugging in development
    if (dev) {
      console.log('Analytics Event:', enrichedEvent);
    }
  }
  
  // ===== Cart Events =====
  
  trackAddToCart(item: EcommerceItem, cartValue: number) {
    this.track({
      event: 'add_to_cart',
      category: 'ecommerce',
      action: 'add_to_cart',
      label: item.item_name,
      value: item.price * item.quantity,
      ecommerce: {
        currency: 'BRL',
        value: cartValue,
        items: [item]
      }
    });
  }
  
  trackRemoveFromCart(item: EcommerceItem, cartValue: number) {
    this.track({
      event: 'remove_from_cart',
      category: 'ecommerce',
      action: 'remove_from_cart',
      label: item.item_name,
      value: item.price * item.quantity,
      ecommerce: {
        currency: 'BRL',
        value: cartValue,
        items: [item]
      }
    });
  }
  
  trackViewCart(items: EcommerceItem[], cartValue: number) {
    this.track({
      event: 'view_cart',
      category: 'ecommerce',
      action: 'view_cart',
      value: cartValue,
      ecommerce: {
        currency: 'BRL',
        value: cartValue,
        items
      }
    });
  }
  
  trackBeginCheckout(items: EcommerceItem[], cartValue: number, coupon?: string) {
    this.track({
      event: 'begin_checkout',
      category: 'ecommerce',
      action: 'begin_checkout',
      value: cartValue,
      ecommerce: {
        currency: 'BRL',
        value: cartValue,
        items,
        coupon
      }
    });
  }
  
  trackShippingCalculation(zipCode: string, shippingMode: string, shippingCost: number) {
    this.track({
      event: 'shipping_calculation',
      category: 'cart',
      action: 'calculate_shipping',
      label: shippingMode,
      value: shippingCost,
      custom_parameters: {
        zip_code_prefix: zipCode.substring(0, 5), // Apenas primeiros 5 dígitos por privacidade
        shipping_mode: shippingMode
      }
    });
  }
  
  trackCouponApplied(couponCode: string, discountValue: number, cartValue: number) {
    this.track({
      event: 'coupon_applied',
      category: 'cart',
      action: 'apply_coupon',
      label: couponCode,
      value: discountValue,
      custom_parameters: {
        coupon_code: couponCode,
        discount_value: discountValue,
        cart_value: cartValue
      }
    });
  }
  
  trackCartAbandonment(items: EcommerceItem[], cartValue: number, timeSpent: number) {
    this.track({
      event: 'cart_abandonment',
      category: 'ecommerce',
      action: 'abandon_cart',
      value: cartValue,
      ecommerce: {
        currency: 'BRL',
        value: cartValue,
        items
      },
      custom_parameters: {
        time_spent_seconds: timeSpent,
        item_count: items.length
      }
    });
  }
  
  // ===== Product Events =====
  
  trackProductView(item: EcommerceItem) {
    this.track({
      event: 'view_item',
      category: 'ecommerce',
      action: 'view_product',
      label: item.item_name,
      value: item.price,
      ecommerce: {
        currency: 'BRL',
        value: item.price,
        items: [item]
      }
    });
  }
  
  trackSearch(searchTerm: string, resultsCount: number) {
    this.track({
      event: 'search',
      category: 'engagement',
      action: 'search',
      label: searchTerm,
      value: resultsCount,
      custom_parameters: {
        search_term: searchTerm,
        results_count: resultsCount
      }
    });
  }
  
  // ===== User Engagement =====
  
  trackUserRegistration(method: string) {
    this.track({
      event: 'sign_up',
      category: 'engagement',
      action: 'user_registration',
      label: method,
      custom_parameters: {
        method
      }
    });
  }
  
  trackUserLogin(method: string) {
    this.track({
      event: 'login',
      category: 'engagement',
      action: 'user_login',
      label: method,
      custom_parameters: {
        method
      }
    });
  }
  
  // ===== Performance Tracking =====
  
  trackPageLoadTime(pageName: string, loadTime: number) {
    this.track({
      event: 'page_performance',
      category: 'performance',
      action: 'page_load',
      label: pageName,
      value: loadTime,
      custom_parameters: {
        load_time_ms: loadTime,
        page_name: pageName
      }
    });
  }
  
  trackApiResponse(endpoint: string, responseTime: number, status: number) {
    this.track({
      event: 'api_performance',
      category: 'performance',
      action: 'api_call',
      label: endpoint,
      value: responseTime,
      custom_parameters: {
        endpoint,
        response_time_ms: responseTime,
        status_code: status
      }
    });
  }
  
  // ===== Private Methods =====
  
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  private setupPageTracking() {
    // Track page views automatically
    let currentPath = window.location.pathname;
    
    // Initial page view
    this.trackPageView(currentPath);
    
    // Track route changes (for SPA)
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        this.trackPageView(currentPath);
      }
    });
    
    observer.observe(document, { subtree: true, childList: true });
  }
  
  private trackPageView(path: string) {
    this.track({
      event: 'page_view',
      category: 'engagement',
      action: 'page_view',
      label: path,
      custom_parameters: {
        page_path: path
      }
    });
  }
  
  private async sendToGA4(event: AnalyticsEvent & any) {
    // TODO: Implement Google Analytics 4 integration
    if (window.gtag) {
      window.gtag('event', event.event, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event.custom_parameters,
        ...event.ecommerce && { ecommerce: event.ecommerce }
      });
    }
  }
  
  private async sendToInternalAnalytics(event: AnalyticsEvent & any) {
    // TODO: Send to internal analytics API
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send to internal analytics:', error);
    }
  }
  
  private async sendToPixel(event: AnalyticsEvent & any) {
    // TODO: Implement Facebook Pixel integration
    if (window.fbq) {
      switch (event.event) {
        case 'add_to_cart':
          window.fbq('track', 'AddToCart', {
            value: event.value,
            currency: 'BRL',
            content_ids: event.ecommerce?.items?.map((item: EcommerceItem) => item.item_id),
            content_type: 'product'
          });
          break;
        case 'begin_checkout':
          window.fbq('track', 'InitiateCheckout', {
            value: event.value,
            currency: 'BRL',
            content_ids: event.ecommerce?.items?.map((item: EcommerceItem) => item.item_id),
            content_type: 'product'
          });
          break;
        case 'purchase':
          window.fbq('track', 'Purchase', {
            value: event.value,
            currency: 'BRL',
            content_ids: event.ecommerce?.items?.map((item: EcommerceItem) => item.item_id),
            content_type: 'product'
          });
          break;
      }
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Helper function to convert Product to EcommerceItem
export function productToEcommerceItem(product: any, quantity: number = 1): EcommerceItem {
  return {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    item_brand: product.brand,
    price: product.price,
    quantity,
    currency: 'BRL'
  };
}

// Cart abandonment tracking helper
export function setupCartAbandonmentTracking() {
  let cartVisitTime = Date.now();
  let hasItems = false;
  
  // Reset timer when cart changes
  window.addEventListener('cart-updated', (event: any) => {
    const { items, cartValue } = event.detail;
    hasItems = items.length > 0;
    cartVisitTime = Date.now();
  });
  
  // Track abandonment on page unload
  window.addEventListener('beforeunload', () => {
    if (hasItems) {
      const timeSpent = Math.round((Date.now() - cartVisitTime) / 1000);
      // Use sendBeacon for reliable tracking during page unload
      const event = {
        event: 'cart_abandonment',
        time_spent: timeSpent,
        timestamp: new Date().toISOString()
      };
      
      navigator.sendBeacon('/api/analytics', JSON.stringify(event));
    }
  });
}

// TypeScript declarations for external libraries
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
} 