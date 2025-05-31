<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import Layout from '../../../packages/ui/src/lib/components/layout/Layout.svelte';
	
	// Dados específicos do Admin Panel
	const title = 'Admin Panel';
	const titleIcon = '🛠️';
	const userInfo = {
		name: 'Admin GDG',
		subtitle: 'admin',
		initials: 'AG',
		role: 'admin'
	};
	
	// Menu específico do Admin
	const menuItems = [
		{ path: '/', icon: '📊', label: 'Dashboard' },
		{ path: '/produtos', icon: '📦', label: 'Produtos' },
		{ path: '/pedidos', icon: '🛒', label: 'Pedidos' },
		{ path: '/usuarios', icon: '👥', label: 'Usuários' },
		{ separator: true },
		{ path: '/relatorios', icon: '📈', label: 'Relatórios' },
		{ path: '/configuracoes', icon: '⚙️', label: 'Configurações' }
	];
	
	let currentPath = '';
	
	onMount(() => {
		currentPath = window.location.pathname;
	});
</script>

<Layout {title} {titleIcon} {userInfo} {menuItems} {currentPath}>
	<slot />
</Layout>
