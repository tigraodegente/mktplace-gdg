/** @type {import('tailwindcss').Config} */
export default {
	theme: {
		extend: {
			colors: {
				// Cores principais
				primary: '#00BFB3',
				'text-primary': '#312627',
				background: '#f0f0f0',
				
				// Tons de Cyan (atualizados para o padrão da store)
				cyan: {
					50: '#E0F7F6',
					100: '#B3F0ED',
					200: '#80E8E3',
					300: '#4DE0D9',
					400: '#26D9D0',
					500: '#00BFB3',
					600: '#00A89D',
					700: '#008A82',
					800: '#006B66',
					900: '#005653',
				},
				
				// Tons de Cinza (atualizados para o padrão da store)
				gray: {
					50: '#F9FAFB',
					100: '#F3F4F6',
					200: '#E5E7EB',
					300: '#9CA3AF',
					400: '#6B7280',
					500: '#4B5563',
					600: '#323232',
					800: 'rgba(0, 0, 0, 0.03)',
				},
				
				// Tons de Rosa
				pink: {
					100: '#FBE7E9',
					300: '#F17179',
					400: '#D34566',
					500: '#F66C85',
				},
				
				// Tons de Azul
				blue: {
					100: '#E0F6FF',
					300: '#5796AF',
				},
				
				// Tons de Amarelo
				yellow: {
					100: '#FFF4CC',
					200: '#f5ef7d',
					300: '#F9A51A',
				},
				
				// Tons de Marrom
				brown: {
					100: '#FADEB9',
					300: '#BB7E2C',
				},
				
				// Tons de Verde
				green: {
					100: '#dcfce7',
					300: '#d9f57d',
					400: '#abf57d',
					800: '#15803d',
				},
				
				// Tons de Laranja
				orange: {
					200: '#ffd08a',
					400: '#e47004',
				},
				
				// Tons de Vermelho
				red: {
					50: '#f8d7da',
					100: '#fee2e2',
					200: '#ff8a8a',
					400: '#ff4a4a',
					500: '#ef4444',
					600: '#dc2626',
					800: '#842029',
				},
			},
			fontFamily: {
				sans: ['Lato', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
			},
			maxWidth: {
				'[1440px]': '1440px',
			},
		},
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography'),
	],
} 