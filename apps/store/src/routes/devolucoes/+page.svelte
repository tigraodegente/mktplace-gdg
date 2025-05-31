<script lang="ts">
	import { onMount } from 'svelte';
	import { formatCurrency } from '@mktplace/utils';
	
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
			const response = await fetch('/api/returns', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...returnForm,
					items: [{ // Mock item
						order_item_id: '1',
						quantity: 1,
						unit_price: 199.90,
						product_name: 'Produto Exemplo'
					}]
				})
			});
			
			const data = await response.json();
			
			if (data.success) {
				alert('Solicitação criada com sucesso!');
				showNewReturnModal = false;
				returnForm = { order_id: '', type: 'return', reason_id: '', custom_reason: '', items: [], photos: [] };
				loadReturns();
			}
		} catch (err) {
			console.error('Erro ao criar devolução:', err);
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
	<meta name="description" content="Gerencie suas devoluções e trocas" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-6xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Devoluções e Trocas</h1>
			<p class="text-gray-600">
				Gerencie suas solicitações de devolução e troca de produtos
			</p>
		</div>

		<!-- Info Cards -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			<div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold text-gray-900">7 Dias</h3>
						<p class="text-sm text-gray-600">Prazo para solicitar</p>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold text-gray-900">Grátis</h3>
						<p class="text-sm text-gray-600">Primeira troca gratuita</p>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold text-gray-900">Rápido</h3>
						<p class="text-sm text-gray-600">Até 7 dias úteis</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex justify-between items-center mb-6">
			<h2 class="text-xl font-semibold text-gray-900">Minhas Solicitações</h2>
			<button
				onclick={() => showNewReturnModal = true}
				class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
			>
				Nova Solicitação
			</button>
		</div>

		<!-- Lista de Devoluções -->
		<div class="bg-white rounded-lg shadow-sm">
			{#if loading}
				<div class="p-8 text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFB3] mx-auto mb-4"></div>
					<p class="text-gray-600">Carregando solicitações...</p>
				</div>
			{:else if returns.length === 0}
				<div class="p-12 text-center">
					<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
					</svg>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">Nenhuma solicitação</h3>
					<p class="text-gray-600 mb-4">Você ainda não fez nenhuma solicitação de devolução ou troca.</p>
					<button
						onclick={() => showNewReturnModal = true}
						class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D]"
					>
						Primeira Solicitação
					</button>
				</div>
			{:else}
				<div class="divide-y divide-gray-200">
					{#each returns as returnItem}
						<div class="p-6">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-3 mb-3">
										<span class="font-mono text-sm bg-gray-50 px-2 py-1 rounded">
											{returnItem.return_number}
										</span>
										<span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(returnItem.status)}">
											{getStatusLabel(returnItem.status)}
										</span>
										<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
											{getTypeLabel(returnItem.type)}
										</span>
									</div>
									
									<h3 class="font-semibold text-gray-900 mb-1">
										Pedido: {returnItem.order_id}
									</h3>
									<p class="text-sm text-gray-600 mb-2">
										Motivo: {returnItem.reason}
									</p>
									
									<!-- Itens -->
									<div class="space-y-2">
										{#each returnItem.items as item}
											<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
												<img 
													src={item.image} 
													alt={item.product_name}
													class="w-12 h-12 object-cover rounded"
												/>
												<div class="flex-1">
													<p class="font-medium text-gray-900">{item.product_name}</p>
													<p class="text-sm text-gray-600">
														Qtd: {item.quantity} • {formatCurrency(item.unit_price)}
													</p>
												</div>
											</div>
										{/each}
									</div>
								</div>
								
								<div class="text-right ml-6">
									<p class="text-sm text-gray-500 mb-1">
										{formatDate(returnItem.created_at)}
									</p>
									<p class="font-semibold text-gray-900 mb-2">
										{formatCurrency(returnItem.total_amount)}
									</p>
									{#if returnItem.refund_amount > 0}
										<p class="text-sm text-green-600">
											Reembolso: {formatCurrency(returnItem.refund_amount)}
										</p>
									{/if}
									<button 
										onclick={() => selectedReturn = returnItem}
										class="mt-2 text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium"
									>
										Ver detalhes
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Modal Nova Solicitação -->
{#if showNewReturnModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-6">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-xl font-semibold text-gray-900">Nova Solicitação</h2>
					<button
						onclick={() => showNewReturnModal = false}
						class="text-gray-400 hover:text-gray-600"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<form onsubmit={(e) => { e.preventDefault(); createReturn(); }} class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Número do Pedido</label>
						<input
							type="text"
							bind:value={returnForm.order_id}
							placeholder="MP123456789"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3]"
							required
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Solicitação</label>
						<select
							bind:value={returnForm.type}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3]"
						>
							<option value="return">Devolução (reembolso)</option>
							<option value="exchange">Troca (outro produto)</option>
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
						<select
							bind:value={returnForm.reason_id}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3]"
							required
						>
							<option value="">Selecione um motivo</option>
							{#each returnReasons as reason}
								<option value={reason.id}>{reason.name} - {reason.description}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">
							Observações Adicionais (opcional)
						</label>
						<textarea
							bind:value={returnForm.custom_reason}
							placeholder="Descreva detalhes adicionais sobre o problema..."
							rows="4"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3]"
						></textarea>
					</div>

					<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<div class="flex items-start gap-3">
							<svg class="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
							<div>
								<h4 class="font-medium text-yellow-800">Informações Importantes</h4>
								<ul class="mt-2 text-sm text-yellow-700 space-y-1">
									<li>• Prazo de 7 dias corridos após o recebimento</li>
									<li>• Produto deve estar em perfeitas condições</li>
									<li>• Embalagem original e etiquetas preservadas</li>
									<li>• Para alguns motivos, fotos podem ser necessárias</li>
								</ul>
							</div>
						</div>
					</div>

					<div class="flex gap-3 pt-4">
						<button
							type="submit"
							class="flex-1 px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
						>
							Criar Solicitação
						</button>
						<button
							type="button"
							onclick={() => showNewReturnModal = false}
							class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
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
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-6">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-xl font-semibold text-gray-900">
						Detalhes da Solicitação {selectedReturn.return_number}
					</h2>
					<button
						onclick={() => selectedReturn = null}
						class="text-gray-400 hover:text-gray-600"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div class="space-y-6">
					<!-- Status -->
					<div>
						<h3 class="font-medium text-gray-900 mb-2">Status Atual</h3>
						<span class="px-3 py-2 text-sm font-medium rounded-full {getStatusColor(selectedReturn.status)}">
							{getStatusLabel(selectedReturn.status)}
						</span>
					</div>

					<!-- Informações Gerais -->
					<div>
						<h3 class="font-medium text-gray-900 mb-2">Informações</h3>
						<div class="bg-gray-50 rounded-lg p-4 space-y-2">
							<div class="flex justify-between">
								<span class="text-gray-600">Tipo:</span>
								<span class="font-medium">{getTypeLabel(selectedReturn.type)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Pedido:</span>
								<span class="font-medium">{selectedReturn.order_id}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Data:</span>
								<span class="font-medium">{formatDate(selectedReturn.created_at)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">Valor Total:</span>
								<span class="font-medium">{formatCurrency(selectedReturn.total_amount)}</span>
							</div>
							{#if selectedReturn.refund_amount > 0}
								<div class="flex justify-between">
									<span class="text-gray-600">Reembolso:</span>
									<span class="font-medium text-green-600">{formatCurrency(selectedReturn.refund_amount)}</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Motivo -->
					<div>
						<h3 class="font-medium text-gray-900 mb-2">Motivo</h3>
						<p class="text-gray-700">{selectedReturn.reason}</p>
					</div>

					<!-- Próximos Passos -->
					<div>
						<h3 class="font-medium text-gray-900 mb-2">Próximos Passos</h3>
						<div class="space-y-2">
							{#if selectedReturn.status === 'requested'}
								<p class="text-sm text-gray-600">
									⏳ Aguardando análise da nossa equipe (até 24h)
								</p>
							{:else if selectedReturn.status === 'approved'}
								<p class="text-sm text-gray-600">
									📦 Envie o produto com o código de postagem que será fornecido
								</p>
							{:else if selectedReturn.status === 'received'}
								<p class="text-sm text-gray-600">
									🔍 Produto recebido e em análise (até 3 dias úteis)
								</p>
							{:else if selectedReturn.status === 'processed'}
								<p class="text-sm text-gray-600">
									💰 Reembolso será processado em até 5 dias úteis
								</p>
							{/if}
						</div>
					</div>
				</div>

				<div class="mt-6 pt-6 border-t">
					<button
						onclick={() => selectedReturn = null}
						class="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
					>
						Fechar
					</button>
				</div>
			</div>
		</div>
	</div>
{/if} 