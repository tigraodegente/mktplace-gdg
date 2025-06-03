/**
 * Animações customizadas para o carrinho
 */

import { cubicOut, elasticOut } from 'svelte/easing';

// Stagger delay para animações em lista
export function staggerDelay(index: number, baseDelay: number = 50): number {
	return index * baseDelay;
}

// Configurações de animação reutilizáveis
export const springConfig = {
	stiffness: 0.15,
	damping: 0.8
};

export const smoothSpring = {
	stiffness: 0.05,
	damping: 0.9
};

// Configurações de transição padrão
export const defaultTransition = {
	duration: 300,
	easing: cubicOut
};

export const bounceTransition = {
	duration: 500,
	easing: elasticOut
};

// Função para criar animações de entrada customizadas
export function createEnterTransition(delay: number = 0) {
	return {
		duration: 400,
		delay,
		easing: cubicOut,
		css: (t: number) => `
			opacity: ${t};
			transform: translateY(${(1 - t) * 20}px);
		`
	};
}

// Função para criar animações de saída customizadas
export function createExitTransition() {
	return {
		duration: 200,
		easing: cubicOut,
		css: (t: number) => `
			opacity: ${t};
			transform: scale(${0.95 + t * 0.05});
		`
	};
}

// Durations
export const durations = {
	fast: 200,
	normal: 300,
	slow: 500
};

// Easing functions
export const easings = {
	smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
	bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
	elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)'
}; 