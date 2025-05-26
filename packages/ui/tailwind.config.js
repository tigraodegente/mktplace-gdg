/** @type {import('tailwindcss').Config} */
export default {
	theme: {
		extend: {
			colors: {
				// Cores principais
				primary: '#00BFB3',
				'text-primary': '#312627',
				background: '#f0f0f0',
				
				// Tons de Cyan
				cyan: {
					50: '#EEFDFF',
					100: '#DFF9F7',
					200: '#B3ECE9',
					300: '#2FA9A9',
					500: '#00BFB3',
					600: '#017F77',
					700: '#2D8289',
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
					300: '#d9f57d',
					400: '#abf57d',
				},
				
				// Tons de Laranja
				orange: {
					200: '#ffd08a',
					400: '#e47004',
				},
				
				// Tons de Vermelho
				red: {
					50: '#f8d7da',
					100: '#f5c2c7',
					200: '#ff8a8a',
					400: '#ff4a4a',
					800: '#842029',
				},
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
			},
		},
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography'),
	],
} 