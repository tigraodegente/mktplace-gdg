<script lang="ts">
	import Header from './Header.svelte';
	import Navigation from './Navigation.svelte';
	
	interface Props {
		title?: string;
		titleIcon?: string;
		subtitle?: string;
		userInfo?: {
			name: string;
			subtitle: string;
			initials: string;
			role: string;
		};
		menuItems?: Array<{
			path: string;
			icon: string;
			label: string;
			separator?: boolean;
		}>;
		currentPath?: string;
		children?: any;
	}
	
	let { 
		title = '',
		titleIcon = '',
		subtitle = 'Marketplace GDG',
		userInfo = {
			name: 'Usuário',
			subtitle: 'Role',
			initials: 'U',
			role: 'user'
		},
		menuItems = [],
		currentPath = '',
		children
	}: Props = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<Header {title} {titleIcon} {subtitle} {userInfo} />
	
	<div class="flex">
		<Navigation {menuItems} {currentPath} {userInfo} />
		
		<!-- Main Content -->
		<main class="flex-1 p-8 bg-gray-50">
			<div class="max-w-[1440px] mx-auto">
				{@render children?.()}
			</div>
		</main>
	</div>
</div> 