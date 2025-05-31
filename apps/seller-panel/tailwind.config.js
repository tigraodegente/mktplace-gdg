import sharedConfig from '@mktplace/ui/tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'../ui/src/**/*.{html,js,svelte,ts}',
		'../../packages/ui/src/**/*.{html,js,svelte,ts}'
	],
	theme: {
		colors: {
			// Cores básicas essenciais
			transparent: 'transparent',
			current: 'currentColor',
			inherit: 'inherit',
			white: '#ffffff',
			black: '#000000',
			
			// Escala de cinzas
			gray: {
				25: '#fcfcfd',
				50: '#f9fafb', 
				100: '#f3f4f6',
				200: '#e5e7eb',
				300: '#d1d5db',
				400: '#9ca3af',
				500: '#6b7280',
				600: '#4b5563',
				700: '#374151',
				800: '#1f2937',
				900: '#111827',
				950: '#030712'
			},
			
			// Cores da marca (cyan/turquesa)
			cyan: {
				50: '#E0F7F6',
				100: '#B3F0ED',
				200: '#80E6E1', 
				300: '#4DDDD5',
				400: '#26D0CA',
				500: '#00BFB3', // Cor principal da marca
				600: '#00A89D',
				700: '#008A82',
				800: '#006B66',
				900: '#005653'
			},
			
			// Alias para a cor primária
			primary: {
				50: '#E0F7F6',
				100: '#B3F0ED', 
				200: '#80E6E1',
				300: '#4DDDD5',
				400: '#26D0CA',
				500: '#00BFB3',
				600: '#00A89D',
				700: '#008A82',
				800: '#006B66',
				900: '#005653'
			},
			
			// Vermelho (erros, danger)
			red: {
				50: '#fef2f2',
				100: '#fee2e2',
				200: '#fecaca',
				300: '#fca5a5',
				400: '#f87171',
				500: '#ef4444',
				600: '#dc2626',
				700: '#b91c1c',
				800: '#991b1b',
				900: '#7f1d1d'
			},
			
			// Verde (sucesso)
			green: {
				50: '#f0fdf4',
				100: '#dcfce7',
				200: '#bbf7d0',
				300: '#86efac',
				400: '#4ade80',
				500: '#22c55e',
				600: '#16a34a',
				700: '#15803d',
				800: '#166534',
				900: '#14532d'
			},
			
			// Amarelo (warning)
			yellow: {
				50: '#fefce8',
				100: '#fef3c7',
				200: '#fde68a',
				300: '#fcd34d',
				400: '#fbbf24',
				500: '#f59e0b',
				600: '#d97706',
				700: '#b45309',
				800: '#92400e',
				900: '#78350f'
			},
			
			// Azul
			blue: {
				50: '#eff6ff',
				100: '#dbeafe',
				200: '#bfdbfe',
				300: '#93c5fd',
				400: '#60a5fa',
				500: '#3b82f6',
				600: '#2563eb',
				700: '#1d4ed8',
				800: '#1e40af',
				900: '#1e3a8a'
			}
		},
		
		extend: {
			fontFamily: {
				sans: ['Lato', 'ui-sans-serif', 'system-ui', 'sans-serif']
			},
			maxWidth: {
				'8xl': '1440px'
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem'
			}
		}
	},
	
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography')
	]
}; 