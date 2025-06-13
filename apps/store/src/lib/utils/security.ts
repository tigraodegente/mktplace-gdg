/**
 * Utilitários de segurança para sanitização e validação de dados
 */

/**
 * Sanitizar string removendo caracteres perigosos
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>'"&]/g, '') // Remover caracteres perigosos básicos
    .slice(0, 500); // Limitar tamanho
}

/**
 * Sanitizar email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  return email
    .trim()
    .toLowerCase()
    .slice(0, 255);
}

/**
 * Sanitizar telefone
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') return '';
  
  // Manter apenas números, parênteses, espaços e hífens
  return phone
    .replace(/[^\d\(\)\s\-]/g, '')
    .slice(0, 20);
}

/**
 * Validar email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validar telefone brasileiro
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
  return phoneRegex.test(phone);
}

/**
 * Validar CEP brasileiro
 */
export function isValidCEP(cep: string): boolean {
  const cepRegex = /^\d{5}-?\d{3}$/;
  return cepRegex.test(cep);
}

/**
 * Sanitizar dados de convidado
 */
export function sanitizeGuestData(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Dados de convidado inválidos');
  }
  
  const sanitized = {
    name: sanitizeString(data.name || ''),
    email: sanitizeEmail(data.email || ''),
    phone: sanitizePhone(data.phone || ''),
    acceptsMarketing: Boolean(data.acceptsMarketing),
    sessionId: sanitizeString(data.sessionId || '')
  };
  
  // Validar campos obrigatórios
  if (!sanitized.name || sanitized.name.length < 2) {
    throw new Error('Nome é obrigatório e deve ter pelo menos 2 caracteres');
  }
  
  if (!isValidEmail(sanitized.email)) {
    throw new Error('Email inválido');
  }
  
  if (!isValidPhone(sanitized.phone)) {
    throw new Error('Telefone inválido');
  }
  
  if (!sanitized.sessionId || sanitized.sessionId.length < 10) {
    throw new Error('SessionId inválido');
  }
  
  return sanitized;
}

/**
 * Sanitizar endereço
 */
export function sanitizeAddress(address: any) {
  if (!address || typeof address !== 'object') {
    throw new Error('Dados de endereço inválidos');
  }
  
  const sanitized = {
    street: sanitizeString(address.street || ''),
    number: sanitizeString(address.number || ''),
    complement: sanitizeString(address.complement || ''),
    neighborhood: sanitizeString(address.neighborhood || ''),
    city: sanitizeString(address.city || ''),
    state: sanitizeString(address.state || ''),
    zipCode: sanitizeString(address.zipCode || ''),
    country: 'BR' // Sempre Brasil por enquanto
  };
  
  // Validar campos obrigatórios
  if (!sanitized.street || sanitized.street.length < 3) {
    throw new Error('Endereço é obrigatório');
  }
  
  if (!sanitized.number) {
    throw new Error('Número é obrigatório');
  }
  
  if (!sanitized.neighborhood || sanitized.neighborhood.length < 2) {
    throw new Error('Bairro é obrigatório');
  }
  
  if (!sanitized.city || sanitized.city.length < 2) {
    throw new Error('Cidade é obrigatória');
  }
  
  if (!sanitized.state || sanitized.state.length !== 2) {
    throw new Error('Estado inválido');
  }
  
  if (!isValidCEP(sanitized.zipCode)) {
    throw new Error('CEP inválido');
  }
  
  return sanitized;
}

/**
 * Rate limiting básico em memória
 */
const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Limpar entradas expiradas
  for (const [key, value] of rateLimit.entries()) {
    if (value.resetTime < now) {
      rateLimit.delete(key);
    }
  }
  
  const current = rateLimit.get(identifier);
  
  if (!current) {
    rateLimit.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.resetTime < now) {
    // Janela expirou, resetar
    rateLimit.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false; // Rate limit excedido
  }
  
  current.count++;
  return true;
}

/**
 * Gerar ID seguro
 */
export function generateSecureId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}${timestamp}_${random}`;
} 