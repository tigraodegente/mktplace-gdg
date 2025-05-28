// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string
				email: string
				name: string
				role: string
			}
		}
		// interface PageData {}
		interface Platform {
			env?: {
				HYPERDRIVE_DB?: {
					connectionString: string
				}
			}
			context?: {
				waitUntil(promise: Promise<any>): void
			}
			caches?: CacheStorage & { default: Cache }
		}
	}
}

export {};

// Declaração de módulos Svelte
declare module '*.svelte' {
	import type { ComponentType } from 'svelte';
	const component: ComponentType;
	export default component;
}
