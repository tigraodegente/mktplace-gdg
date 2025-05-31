/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'../../packages/ui/src/**/*.{html,js,svelte,ts}'
	],
	theme: {
		extend: {
			colors: {
				cyan: {
					50: '#ecfeff',
					100: '#cffafe',
					200: '#a5f3fc',
					300: '#67e8f9',
					400: '#22d3ee',
					500: '#00BFB3',
					600: '#00A89D',
					700: '#0e7490',
					800: '#155e75',
					900: '#164e63'
				}
			}
		}
	},
	plugins: []
}; 