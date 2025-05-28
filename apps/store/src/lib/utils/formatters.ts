/**
 * Formata CEP brasileiro
 */
export function formatZipCode(value: string): string {
	const numbers = value.replace(/\D/g, '');
	if (numbers.length <= 5) {
		return numbers;
	}
	return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
}

/**
 * Remove formatação do CEP
 */
export function cleanZipCode(value: string): string {
	return value.replace(/\D/g, '');
}

/**
 * Valida CEP brasileiro
 */
export function isValidZipCode(value: string): boolean {
	const clean = cleanZipCode(value);
	return clean.length === 8 && /^\d{8}$/.test(clean);
} 