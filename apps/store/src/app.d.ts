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
			env: {
				CACHE_KV?: KVNamespace
			}
			context?: {
				waitUntil(promise: Promise<any>): void
			}
			caches?: CacheStorage & { default: Cache }
		}
	}
	
	// Cloudflare KV types
	interface KVNamespace {
		get(key: string, options?: { type: 'text' }): Promise<string | null>
		get<T = unknown>(key: string, options: { type: 'json' }): Promise<T | null>
		get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>
		get(key: string, options: { type: 'stream' }): Promise<ReadableStream | null>
		
		put(key: string, value: string | ArrayBuffer | ReadableStream, options?: {
			expirationTtl?: number
			expiration?: number
			metadata?: any
		}): Promise<void>
		
		delete(key: string): Promise<void>
		
		list(options?: {
			prefix?: string
			limit?: number
			cursor?: string
		}): Promise<{
			keys: Array<{
				name: string
				expiration?: number
				metadata?: any
			}>
			list_complete: boolean
			cursor?: string
		}>
	}
}

export {};

// Declaração de módulos Svelte
declare module '*.svelte' {
	import type { ComponentType } from 'svelte';
	const component: ComponentType;
	export default component;
}
