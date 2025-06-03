/// <reference types="svelte" />
/// <reference types="vite/client" />

import type { SvelteHTMLElements } from 'svelte/elements';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				email: string;
				name: string;
				role: 'admin' | 'vendor' | 'customer';
				seller_id?: string;
				permissions?: string[];
			};
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				DATABASE_URL?: string;
				[key: string]: any;
			};
			context?: any;
			caches?: any;
		}
	}

	// Expandir o namespace svelteHTML para Svelte 5
	namespace svelteHTML {
		interface HTMLAttributes<T = any> extends SvelteHTMLElements {
			[key: string]: any;
		}
		
		interface SVGAttributes<T = any> {
			[key: string]: any;
		}
	}
}

export {};
