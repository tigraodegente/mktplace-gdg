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
}

export {};
