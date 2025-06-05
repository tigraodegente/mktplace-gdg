<script lang="ts">
	import { onMount } from 'svelte';
	import { formatCurrency } from '$lib/utils';
	
	// Estado
	let returns: any[] = [];
	let loading = true;
	let showNewReturnModal = false;
	let selectedReturn: any = null;
	
	// Formulário de devolução
	let returnForm = {
		order_id: '',
		type: 'return', // 'return' ou 'exchange'
		reason_id: '',
		custom_reason: '',
		items: [],
		photos: []
	};
	
	// Motivos de devolução
	const returnReasons = [
		{ id: '1', name: 'Defeito de fabricação', description: 'Produto chegou com defeito', requires_photos: true },
		{ id: '2', name: 'Produto diferente', description: 'Produto diferente do anunciado', requires_photos: true },
		{ id: '3', name: 'Tamanho incorreto', description: 'Tamanho não confere', requires_photos: false },
		{ id: '4', name: 'Não gostei', description: 'Produto não atendeu expectativas', requires_photos: false },
		{ id: '5', name: 'Chegou danificado', description: 'Produto foi danificado no transporte', requires_photos: true },
		{ id: '6', name: 'Erro na compra', description: 'Comprei por engano', requires_photos: false }
	];
	
	onMount(() => {
		loadReturns();
	});
	
	async function loadReturns() {
		try {
			loading = true;
			const response = await fetch('/api/returns');
			const data = await response.json();
			
			if (data.success) {
				returns = data.data.returns;
			}
		} catch (err) {
			console.error('Erro ao carregar devoluções:', err);
		} finally {
			loading = false;
		}
	}
	
	async function createReturn() {
		if (!returnForm.order_id || !returnForm.reason_id) {
			alert('Preencha todos os campos obrigatórios');
			return;
		}
		
		try {
			// Buscar itens do pedido antes de criar a devolução
			const orderResponse = await fetch(`/api/orders/${returnForm.order_id}`);
			if (!orderResponse.ok) {
				alert('Pedido não encontrado');
				return;
			}
			
			const orderData = await orderResponse.json();
			if (!orderData.success) {
				alert('Erro ao buscar dados do pedido');
				return;
			}
			
			// Usar itens reais do pedido
			const items = orderData.data.items.map((item: any) => ({
				product_id: item.product_id,
				quantity: item.quantity,
				price: item.price,
				product_name: item.product_name
			}));
			
			const response = await fetch('/api/returns', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					order_id: returnForm.order_id,
					reason: returnReasons.find(r => r.id === returnForm.reason_id)?.name || 'Outros',
					description: returnForm.custom_reason,
					items: items,
					refund_type: returnForm.type === 'return' ? 'original_payment' : 'exchange'
				})
			});
			
			const data = await response.json();
			
			if (data.success) {
				alert('Solicitação criada com sucesso!');
				showNewReturnModal = false;
				returnForm = { order_id: '', type: 'return', reason_id: '', custom_reason: '', items: [], photos: [] };
				loadReturns();
			} else {
				alert(data.error || 'Erro ao criar solicitação');
			}
		} catch (err) {
			console.error('Erro ao criar devolução:', err);
			alert('Erro ao processar solicitação');
		}
	}
	
	function getStatusColor(status: string) {
		switch (status) {
			case 'requested': return 'bg-yellow-100 text-yellow-800';
			case 'approved': return 'bg-green-100 text-green-800';
			case 'rejected': return 'bg-red-100 text-red-800';
			case 'shipped_by_customer': return 'bg-blue-100 text-blue-800';
			case 'received': return 'bg-purple-100 text-purple-800';
			case 'processed': return 'bg-indigo-100 text-indigo-800';
			case 'refunded': return 'bg-green-100 text-green-800';
			case 'completed': return 'bg-gray-50 text-gray-800';
			default: return 'bg-gray-50 text-gray-800';
		}
	}
	
	function getStatusLabel(status: string) {
		switch (status) {
			case 'requested': return 'Solicitado';
			case 'approved': return 'Aprovado';
			case 'rejected': return 'Rejeitado';
			case 'shipped_by_customer': return 'Enviado pelo Cliente';
			case 'received': return 'Recebido';
			case 'processed': return 'Processado';
			case 'refunded': return 'Reembolsado';
			case 'completed': return 'Concluído';
			default: return status;
		}
	}
	
	function getTypeLabel(type: string) {
		return type === 'return' ? 'Devolução' : 'Troca';
	}
	
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('pt-BR');
	}
</script>

<svelte:head>
	<title>Devoluções e Trocas - Grão de Gente Marketplace</title>
	<meta name="description" content="Gerencie suas devoluções e trocas de produtos de forma simples e rápida" />
	<meta name="keywords" content="devoluções, trocas, reembolso, garantia, atendimento, grão de gente, marketplace" />
</svelte:head>

<!-- Conteúdo Principal -->
<main class="py-6">
	<div class="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Header Padrão do Projeto -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6" style="font-family: 'Lato', sans-serif;">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
						</svg>
					</div>
					<div>
						<h1 class="text-2xl sm:text-3xl font-bold text-gray-900" style="font-family: 'Lato', sans-serif;">Devoluções e Trocas</h1>
						<p class="mt-1 text-gray-600 text-sm sm:text-base" style="font-family: 'Lato', sans-serif;">
							{#if returns.length > 0}
								{returns.length} {returns.length === 1 ? 'solicitação ativa' : 'solicitações ativas'} • Política de 7 dias
							{:else}
								Gerencie suas solicitações de devolução e troca com facilidade
							{/if}
						</p>
					</div>
				</div>
				
				<a 
					href="/" 
					class="text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors text-sm sm:text-base px-4 py-2 sm:px-0 sm:py-0 bg-[#00BFB3]/5 sm:bg-transparent rounded-lg sm:rounded-none"
					style="font-family: 'Lato', sans-serif;"
				>
					<span class="sm:hidden">Voltar</span>
					<span class="hidden sm:inline">← Continuar Comprando</span>
				</a>
			</div>
			
			<!-- Descrição expandível -->
			<div class="mt-6 pt-6 border-t border-gray-200">
				<div class="text-center">
					<p class="text-gray-600 text-base leading-relaxed" style="font-family: 'Lato', sans-serif;">
						Processo simples e transparente: você tem até 7 dias para solicitar troca ou devolução. 
						Primeira troca é grátis e reembolso em até 7 dias úteis.
					</p>
				</div>
			</div>
		</div>

		<!-- Cards Informativos -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
			<!-- Prazo -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-1" style="font-family: 'Lato', sans-serif;">7 Dias</h3>
						<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">Prazo para solicitar troca ou devolução</p>
					</div>
				</div>
			</div>

			<!-- Primeira Troca Grátis -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
						</svg>
					</div>
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-1" style="font-family: 'Lato', sans-serif;">Grátis</h3>
						<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">Primeira troca sem custo adicional</p>
					</div>
				</div>
			</div>

			<!-- Processamento Rápido -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-1" style="font-family: 'Lato', sans-serif;">Rápido</h3>
						<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">Processamento em até 7 dias úteis</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Action Bar -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
						<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
						</svg>
					</div>
					<div>
						<h2 class="text-lg sm:text-xl font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">Minhas Solicitações</h2>
						<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
							{#if returns.length > 0}
								{returns.length} {returns.length === 1 ? 'solicitação encontrada' : 'solicitações encontradas'}
							{:else}
								Nenhuma solicitação criada ainda
							{/if}
						</p>
					</div>
				</div>
				
				<button
					onclick={() => showNewReturnModal = true}
					class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 focus:outline-none transition-all font-medium"
					style="font-family: 'Lato', sans-serif;"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
					<span class="sm:hidden">Nova Solicitação</span>
					<span class="hidden sm:inline">Nova Solicitação</span>
				</button>
			</div>
		</div>

		<!-- Lista de Devoluções -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			{#if loading}
				<div class="p-12 text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-[#00BFB3] mx-auto mb-6"></div>
					<h3 class="text-lg font-semibold text-gray-900 mb-2" style="font-family: 'Lato', sans-serif;">Carregando solicitações</h3>
					<p class="text-gray-600" style="font-family: 'Lato', sans-serif;">Aguarde enquanto buscamos suas solicitações...</p>
				</div>
			{:else if returns.length === 0}
				<div class="p-16 text-center">
					<div class="w-20 h-20 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-6">
						<svg class="w-10 h-10 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
						</svg>
					</div>
					<h3 class="text-2xl font-bold text-gray-900 mb-3" style="font-family: 'Lato', sans-serif;">Nenhuma solicitação encontrada</h3>
					<p class="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed" style="font-family: 'Lato', sans-serif;">
						Você ainda não fez nenhuma solicitação de devolução ou troca. 
						Nossa política permite até 7 dias para solicitar.
					</p>
					<button
						onclick={() => showNewReturnModal = true}
						class="inline-flex items-center gap-2 px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 focus:outline-none transition-all font-semibold"
						style="font-family: 'Lato', sans-serif;"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
						</svg>
						Criar Primeira Solicitação
					</button>
				</div>
			{:else}
				<div class="divide-y divide-gray-200">
					{#each returns as returnItem}
						<div class="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
							<div class="flex flex-col lg:flex-row lg:items-start gap-6">
								<div class="flex-1">
									<div class="flex flex-wrap items-center gap-2 mb-4">
										<span class="font-mono text-xs sm:text-sm bg-[#00BFB3]/10 text-[#00BFB3] px-3 py-1 rounded-full font-medium">
											#{returnItem.return_number}
										</span>
										<span class="px-3 py-1 text-xs font-medium rounded-full {getStatusColor(returnItem.status)}">
											{getStatusLabel(returnItem.status)}
										</span>
										<span class="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
											{getTypeLabel(returnItem.type)}
										</span>
									</div>
									
									<h3 class="text-lg font-semibold text-gray-900 mb-2" style="font-family: 'Lato', sans-serif;">
										Pedido: {returnItem.order_id}
									</h3>
									<p class="text-sm text-gray-600 mb-4" style="font-family: 'Lato', sans-serif;">
										<span class="font-medium">Motivo:</span> {returnItem.reason}
									</p>
									
									<!-- Itens -->
									<div class="space-y-3">
										{#each returnItem.items as item}
											<div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
												<img 
													src={item.image} 
													alt={item.product_name}
													class="w-14 h-14 object-cover rounded-lg"
												/>
												<div class="flex-1">
													<p class="font-medium text-gray-900 mb-1" style="font-family: 'Lato', sans-serif;">
														{item.product_name}
													</p>
													<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
														<span class="font-medium">Qtd:</span> {item.quantity} • 
														<span class="font-medium">{formatCurrency(item.unit_price)}</span>
													</p>
												</div>
											</div>
										{/each}
									</div>
								</div>
								
								<div class="lg:text-right lg:flex-shrink-0">
									<div class="bg-gray-50 rounded-lg p-4 lg:min-w-[160px]">
										<div class="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-0">
											<div class="lg:mb-3">
												<p class="text-xs text-gray-500 mb-1" style="font-family: 'Lato', sans-serif;">
													Criado em
												</p>
												<p class="text-sm font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">
													{formatDate(returnItem.created_at)}
												</p>
											</div>
											
											<div class="lg:mb-3">
												<p class="text-xs text-gray-500 mb-1" style="font-family: 'Lato', sans-serif;">
													Valor Total
												</p>
												<p class="text-lg font-bold text-gray-900" style="font-family: 'Lato', sans-serif;">
													{formatCurrency(returnItem.total_amount)}
												</p>
											</div>
											
											{#if returnItem.refund_amount > 0}
												<div class="col-span-2 lg:col-span-1 lg:mb-3">
													<p class="text-xs text-green-600 mb-1" style="font-family: 'Lato', sans-serif;">
														Reembolso
													</p>
													<p class="text-sm font-semibold text-green-600" style="font-family: 'Lato', sans-serif;">
														{formatCurrency(returnItem.refund_amount)}
													</p>
												</div>
											{/if}
										</div>
										
										<button 
											onclick={() => selectedReturn = returnItem}
											class="w-full inline-flex items-center justify-center gap-1 px-4 py-3 mt-4 text-sm text-[#00BFB3] hover:text-[#00A89D] hover:bg-[#00BFB3]/5 rounded-lg transition-all font-medium border border-[#00BFB3]/20"
											style="font-family: 'Lato', sans-serif;"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											</svg>
											Ver Detalhes
										</button>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
	</div>
</main>

<!-- Modal Nova Solicitação -->
{#if showNewReturnModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-4 sm:p-6">
				<div class="flex items-center justify-between mb-6">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">Nova Solicitação</h2>
					</div>
					<button
						onclick={() => showNewReturnModal = false}
						class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<form onsubmit={(e) => { e.preventDefault(); createReturn(); }} class="space-y-6">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2" style="font-family: 'Lato', sans-serif;">
							Número do Pedido
						</label>
						<input
							type="text"
							bind:value={returnForm.order_id}
							placeholder="Ex: MP123456789"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3] transition-colors"
							style="font-family: 'Lato', sans-serif;"
							required
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2" style="font-family: 'Lato', sans-serif;">
							Tipo de Solicitação
						</label>
						<select
							bind:value={returnForm.type}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3] transition-colors"
							style="font-family: 'Lato', sans-serif;"
						>
							<option value="return">Devolução (reembolso)</option>
							<option value="exchange">Troca (outro produto)</option>
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2" style="font-family: 'Lato', sans-serif;">
							Motivo da Solicitação
						</label>
						<select
							bind:value={returnForm.reason_id}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3] transition-colors"
							style="font-family: 'Lato', sans-serif;"
							required
						>
							<option value="">Selecione um motivo</option>
							{#each returnReasons as reason}
								<option value={reason.id}>{reason.name} - {reason.description}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2" style="font-family: 'Lato', sans-serif;">
							Observações Adicionais (opcional)
						</label>
						<textarea
							bind:value={returnForm.custom_reason}
							placeholder="Descreva detalhes adicionais sobre o problema, condições do produto, etc..."
							rows="4"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3] transition-colors resize-none"
							style="font-family: 'Lato', sans-serif;"
						></textarea>
					</div>

					<div class="bg-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-lg p-5">
						<div class="flex items-start gap-4">
							<div class="w-8 h-8 bg-[#00BFB3]/10 rounded-full flex items-center justify-center flex-shrink-0">
								<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h4 class="font-semibold text-gray-900 mb-3" style="font-family: 'Lato', sans-serif;">Informações Importantes</h4>
								<ul class="text-sm text-gray-700 space-y-2" style="font-family: 'Lato', sans-serif;">
									<li class="flex items-start gap-2">
										<span class="w-1.5 h-1.5 bg-[#00BFB3] rounded-full mt-2 flex-shrink-0"></span>
										Prazo de 7 dias corridos após o recebimento do produto
									</li>
									<li class="flex items-start gap-2">
										<span class="w-1.5 h-1.5 bg-[#00BFB3] rounded-full mt-2 flex-shrink-0"></span>
										Produto deve estar em perfeitas condições de uso
									</li>
									<li class="flex items-start gap-2">
										<span class="w-1.5 h-1.5 bg-[#00BFB3] rounded-full mt-2 flex-shrink-0"></span>
										Embalagem original e etiquetas preservadas
									</li>
									<li class="flex items-start gap-2">
										<span class="w-1.5 h-1.5 bg-[#00BFB3] rounded-full mt-2 flex-shrink-0"></span>
										Para alguns motivos, fotos podem ser solicitadas
									</li>
								</ul>
							</div>
						</div>
					</div>

					<div class="flex gap-4 pt-6">
						<button
							type="submit"
							class="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 focus:outline-none transition-all font-semibold"
							style="font-family: 'Lato', sans-serif;"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							Criar Solicitação
						</button>
						<button
							type="button"
							onclick={() => showNewReturnModal = false}
							class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all font-medium"
							style="font-family: 'Lato', sans-serif;"
						>
							Cancelar
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Detalhes da Devolução -->
{#if selectedReturn}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-4 sm:p-6">
				<div class="flex items-center justify-between mb-6">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">
							Solicitação #{selectedReturn.return_number}
						</h2>
					</div>
					<button
						onclick={() => selectedReturn = null}
						class="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div class="space-y-8">
					<!-- Status -->
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-3" style="font-family: 'Lato', sans-serif;">Status Atual</h3>
						<div class="flex items-center gap-3">
							<span class="px-4 py-2 text-sm font-semibold rounded-full {getStatusColor(selectedReturn.status)}">
								{getStatusLabel(selectedReturn.status)}
							</span>
							<div class="flex-1 h-px bg-gray-200"></div>
						</div>
					</div>

					<!-- Informações Gerais -->
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-4" style="font-family: 'Lato', sans-serif;">Informações Gerais</h3>
						<div class="bg-gray-50 rounded-lg p-6">
							<div class="grid grid-cols-2 gap-4">
								<div>
									<p class="text-sm text-gray-500 mb-1" style="font-family: 'Lato', sans-serif;">Tipo</p>
									<p class="font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">{getTypeLabel(selectedReturn.type)}</p>
								</div>
								<div>
									<p class="text-sm text-gray-500 mb-1" style="font-family: 'Lato', sans-serif;">Pedido</p>
									<p class="font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">{selectedReturn.order_id}</p>
								</div>
								<div>
									<p class="text-sm text-gray-500 mb-1" style="font-family: 'Lato', sans-serif;">Data da Solicitação</p>
									<p class="font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">{formatDate(selectedReturn.created_at)}</p>
								</div>
								<div>
									<p class="text-sm text-gray-500 mb-1" style="font-family: 'Lato', sans-serif;">Valor Total</p>
									<p class="font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">{formatCurrency(selectedReturn.total_amount)}</p>
								</div>
								{#if selectedReturn.refund_amount > 0}
									<div class="col-span-2 pt-2 border-t border-gray-200">
										<p class="text-sm text-gray-500 mb-1" style="font-family: 'Lato', sans-serif;">Valor do Reembolso</p>
										<p class="text-lg font-bold text-green-600" style="font-family: 'Lato', sans-serif;">{formatCurrency(selectedReturn.refund_amount)}</p>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Motivo -->
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-3" style="font-family: 'Lato', sans-serif;">Motivo da Solicitação</h3>
						<div class="bg-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-lg p-4">
							<p class="text-gray-700 leading-relaxed" style="font-family: 'Lato', sans-serif;">{selectedReturn.reason}</p>
						</div>
					</div>

					<!-- Próximos Passos -->
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-4" style="font-family: 'Lato', sans-serif;">Próximos Passos</h3>
						<div class="bg-gray-50 rounded-lg p-5">
							{#if selectedReturn.status === 'requested'}
								<div class="flex items-start gap-4">
									<div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
										<svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
									</div>
									<div>
										<h4 class="font-semibold text-gray-900 mb-1" style="font-family: 'Lato', sans-serif;">Aguardando Análise</h4>
										<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
											Nossa equipe analisará sua solicitação em até 24 horas
										</p>
									</div>
								</div>
							{:else if selectedReturn.status === 'approved'}
								<div class="flex items-start gap-4">
									<div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
										<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
										</svg>
									</div>
									<div>
										<h4 class="font-semibold text-gray-900 mb-1" style="font-family: 'Lato', sans-serif;">Solicitação Aprovada</h4>
										<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
											Envie o produto com o código de postagem que será fornecido
										</p>
									</div>
								</div>
							{:else if selectedReturn.status === 'received'}
								<div class="flex items-start gap-4">
									<div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
										<svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
										</svg>
									</div>
									<div>
										<h4 class="font-semibold text-gray-900 mb-1" style="font-family: 'Lato', sans-serif;">Produto Recebido</h4>
										<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
											Produto recebido e em análise (até 3 dias úteis)
										</p>
									</div>
								</div>
							{:else if selectedReturn.status === 'processed'}
								<div class="flex items-start gap-4">
									<div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
										<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
										</svg>
									</div>
									<div>
										<h4 class="font-semibold text-gray-900 mb-1" style="font-family: 'Lato', sans-serif;">Processando Reembolso</h4>
										<p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
											Reembolso será processado em até 5 dias úteis
										</p>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<div class="mt-8 pt-6 border-t border-gray-200">
					<button
						onclick={() => selectedReturn = null}
						class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all font-medium"
						style="font-family: 'Lato', sans-serif;"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
						Fechar Detalhes
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
/* CSS Mobile-First e Responsive Design */
@import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap');

/* Base Mobile Styles */
:global(body) {
	font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

/* Touch Improvements */
@media (max-width: 768px) {
	:global(*) {
		-webkit-tap-highlight-color: transparent;
	}
	
	:global(button),
	:global(a),
	:global(input),
	:global(select),
	:global(textarea) {
		min-height: 44px;
		touch-action: manipulation;
	}
}

/* Tablet Optimizations */
@media (min-width: 768px) and (max-width: 1024px) {
	:global(.tablet-padding) {
		padding: 1.5rem;
	}
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
	:global(*) {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
	}
}

@media (prefers-contrast: high) {
	:global(.text-gray-600) {
		color: #374151 !important;
	}
	
	:global(.border-gray-200) {
		border-color: #6b7280 !important;
	}
}

/* Focus States for Keyboard Navigation */
:global(button:focus),
:global(a:focus),
:global(input:focus),
:global(select:focus),
:global(textarea:focus) {
	outline: 2px solid #00BFB3 !important;
	outline-offset: 2px !important;
}

/* Dark Mode Preparation */
@media (prefers-color-scheme: dark) {
	:global(.auto-dark) {
		background-color: #1f2937;
		color: #f9fafb;
	}
}

/* Performance Optimizations */
:global(.page-container) {
	contain: layout;
	will-change: transform;
}

:global(.smooth-scroll) {
	scroll-behavior: smooth;
}

/* Layout Container */
:global(.layout-container) {
	width: 100%;
	max-width: 1280px;
	margin: 0 auto;
	padding: 0 1rem;
}

@media (min-width: 640px) {
	:global(.layout-container) {
		padding: 0 1.5rem;
	}
}

@media (min-width: 1024px) {
	:global(.layout-container) {
		padding: 0 2rem;
	}
}

/* Loading Animation Improvements */
:global(.loading-spinner) {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Modal Improvements */
:global(.modal-backdrop) {
	backdrop-filter: blur(4px);
}

/* Button States */
:global(.btn-primary) {
	background-color: #00BFB3;
	transition: all 0.2s ease;
}

:global(.btn-primary:hover) {
	background-color: #00A89D;
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(0, 191, 179, 0.25);
}

:global(.btn-primary:active) {
	transform: translateY(0);
}

/* Card Enhancements */
:global(.card-hover) {
	transition: all 0.3s ease;
}

:global(.card-hover:hover) {
	transform: translateY(-2px);
	box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

/* Text Selection */
:global(::selection) {
	background-color: rgba(0, 191, 179, 0.2);
	color: inherit;
}

/* Scrollbar Customization */
:global(::-webkit-scrollbar) {
	width: 8px;
	height: 8px;
}

:global(::-webkit-scrollbar-track) {
	background: #f1f5f9;
	border-radius: 4px;
}

:global(::-webkit-scrollbar-thumb) {
	background: #cbd5e1;
	border-radius: 4px;
}

:global(::-webkit-scrollbar-thumb:hover) {
	background: #94a3b8;
}
</style>