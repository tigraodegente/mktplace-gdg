import sharedConfig from '@mktplace/ui/tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'../ui/src/**/*.{html,js,svelte,ts}',
		'../../packages/ui/src/**/*.{html,js,svelte,ts}'
	],
	theme: {
		extend: {
			colors: {
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
					950: '#030712',
				},
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
					900: '#005653',
				},
				cyan: {
					50: '#E0F7F6',
					100: '#B3F0ED',
					200: '#80E6E1',
					300: '#4DDDD5',
					400: '#26D0CA',
					500: '#00BFB3',
					600: '#00A89D',
					700: '#008A82',
					800: '#006B66',
					900: '#005653',
				}
			}
		}
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography')
	]
}
