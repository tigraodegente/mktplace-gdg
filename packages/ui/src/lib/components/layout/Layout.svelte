<script lang="ts">
	import Header from './Header.svelte';
	import Navigation from './Navigation.svelte';
	
	export let title = '';
	export let titleIcon = '';
	export let subtitle = 'Marketplace GDG';
	export let userInfo = {
		name: 'Usuário',
		subtitle: 'Role',
		initials: 'U',
		role: 'user'
	};
	export let menuItems: Array<{
		path: string;
		icon: string;
		label: string;
		separator?: boolean;
	}> = [];
	export let currentPath = '';
</script>

<div class="min-h-screen bg-gray-50">
	<Header {title} {titleIcon} {subtitle} {userInfo} />
	
	<div class="flex">
		<Navigation {menuItems} {currentPath} {userInfo} />
		
		<!-- Main Content -->
		<main class="flex-1 p-8 bg-gray-50">
			<div class="max-w-[1440px] mx-auto">
				<slot />
			</div>
		</main>
	</div>
</div> 