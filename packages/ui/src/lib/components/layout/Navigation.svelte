<script lang="ts">
	interface Props {
		menuItems?: Array<{
			path: string;
			icon: string;
			label: string;
			separator?: boolean;
		}>;
		currentPath?: string;
		userInfo?: {
			name: string;
			subtitle: string;
			role: string;
		};
	}
	
	let {
		menuItems = [],
		currentPath = '',
		userInfo = {
			name: '',
			subtitle: '',
			role: ''
		}
	}: Props = $props();
	
	function isActiveRoute(path: string): boolean {
		return currentPath === path;
	}
</script>

<!-- Sidebar Navigation -->
<aside class="w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
	<nav class="p-4">
		<div class="space-y-1">
			{#each menuItems as item}
				{#if item.separator}
					<!-- Separador -->
					<div class="border-t border-gray-200 my-4"></div>
				{:else}
					<!-- Item de Menu -->
					<a 
						href={item.path}
						class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
							{isActiveRoute(item.path) ? 'bg-cyan-50 text-cyan-700 border-r-2 border-cyan-500' : 'text-gray-700 hover:bg-gray-50'}"
					>
						<span class="mr-3 text-lg">{item.icon}</span>
						{item.label}
					</a>
				{/if}
			{/each}
		</div>
		
		<!-- Footer da Sidebar -->
		<div class="mt-8 pt-4 border-t border-gray-200">
			<button class="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
				<span class="mr-3 text-lg">🔄</span>
				Trocar Role
			</button>
			
			<button class="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1">
				<span class="mr-3 text-lg">🚪</span>
				Sair
			</button>
		</div>
	</nav>
</aside> 