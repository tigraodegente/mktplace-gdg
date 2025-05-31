import sharedConfig from '@mktplace/ui/tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// Cores exatas da Store
				primary: '#00BFB3',
				cyan: {
					50: '#E0F7F6',
					100: '#B3F0ED', 
					200: '#80E8E3',
					300: '#4DE0D9',
					400: '#26D9D0',
					500: '#00BFB3', // Cor primária
					600: '#00A89D',
					700: '#008A82',
					800: '#006B66',
					900: '#005653',
				},
				gray: {
					50: '#F9FAFB',
					100: '#F3F4F6',
					200: '#E5E7EB',
					300: '#D1D5DB',
					400: '#9CA3AF',
					500: '#6B7280',
					600: '#4B5563',
					700: '#374151',
					800: '#1F2937',
					900: '#111827',
				},
				// Cores básicas necessárias para Tailwind v4
				white: '#ffffff',
				black: '#000000',
				red: {
					50: '#FEF2F2',
					100: '#FEE2E2',
					200: '#FECACA',
					300: '#FCA5A5',
					400: '#F87171',
					500: '#EF4444',
					600: '#DC2626',
					700: '#B91C1C',
					800: '#991B1B',
					900: '#7F1D1D',
				},
				green: {
					50: '#F0FDF4',
					100: '#DCFCE7',
					200: '#BBF7D0',
					300: '#86EFAC',
					400: '#4ADE80',
					500: '#22C55E',
					600: '#16A34A',
					700: '#15803D',
					800: '#166534',
					900: '#14532D',
				},
				yellow: {
					50: '#FEFCE8',
					100: '#FEF3C7',
					200: '#FEE68F',
					300: '#FDE047',
					400: '#FACC15',
					500: '#EAB308',
					600: '#CA8A04',
					700: '#A16207',
					800: '#854D0E',
					900: '#713F12',
				},
			},
			fontFamily: {
				sans: ['Lato', 'sans-serif'],
			},
			maxWidth: {
				'8xl': '1440px',
			}
		},
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography'),
	],
} 