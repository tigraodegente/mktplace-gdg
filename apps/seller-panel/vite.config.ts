import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		alias: {
			'@mktplace/utils': new URL('../../packages/utils/src/index.ts', import.meta.url).pathname,
			'@mktplace/shared-types': new URL('../../packages/shared-types/src/index.ts', import.meta.url).pathname,
			'@mktplace/ui': new URL('../../packages/ui/src/index.ts', import.meta.url).pathname,
			'@mktplace/xata-client': new URL('../../packages/xata-client/src/index.ts', import.meta.url).pathname
		}
	},
	test: {
		workspace: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
