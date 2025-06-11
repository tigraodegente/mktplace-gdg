<!-- @ts-nocheck -->
<script lang="ts">
	import { aiReviewStore, aiTotalChanges, aiAppliedChanges, aiPendingChanges, aiReviewActions } from '$lib/stores/aiReview';
	import ModernIcon from './ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';

	interface Props {
		formData: any;
	}

	let { formData }: Props = $props();

	// Estados da loja IA usando stores reativas
	let aiState = $state({
		isActive: false,
		isLoading: false,
		totalChanges: 0,
		appliedChanges: 0,
		pendingChanges: 0
	});

	// Subscrever aos stores
	aiReviewStore.subscribe(state => {
		aiState.isActive = state.isActive;
		aiState.isLoading = state.isLoading;
	});

	aiTotalChanges.subscribe(count => {
		aiState.totalChanges = count;
	});

	aiAppliedChanges.subscribe(count => {
		aiState.appliedChanges = count;
	});

	aiPendingChanges.subscribe(count => {
		aiState.pendingChanges = count;
	});

	// Função para finalizar revisão
	function finishReview() {
		if (aiState.appliedChanges > 0) {
			toast.success(`${aiState.appliedChanges} sugestões aplicadas! Lembre-se de salvar o produto.`);
		}
		aiReviewActions.finishReview();
	}

	// Função para cancelar revisão
	function cancelReview() {
		aiReviewActions.cancelReview(formData);
		toast.info('Revisão IA cancelada');
	}

	// Função para aplicar todas as sugestões
	function applyAllSuggestions() {
		aiReviewActions.applyAllSuggestions(formData);
		toast.success('Todas as sugestões foram aplicadas!');
	}

	// Função para rejeitar todas as sugestões
	function rejectAllSuggestions() {
		aiReviewActions.rejectAllSuggestions();
		toast.info('Todas as sugestões foram rejeitadas');
	}

	// Calcular progresso baseado nas sugestões aplicadas
	let percentage = $derived.by(() => {
		if (aiState.totalChanges === 0) return 0;
		return Math.round((aiState.appliedChanges / aiState.totalChanges) * 100);
	});

	let totalSuggestions = $derived(aiState.totalChanges);
</script>

{#if aiState.isActive}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="ai-review-header">
		<div class="ai-review-content">
			<div class="ai-review-info">
				<div class="ai-review-icon">
					<ModernIcon name="robot" size="lg" />
				</div>
				<div class="ai-review-text">
					<h3>Modo Revisão IA Ativo</h3>
					<p>
						{totalSuggestions} sugestões encontradas | Revise as sugestões nas abas e clique em "Aplicar" nas que desejar usar
					</p>
				</div>
			</div>
			
			<div class="ai-review-actions">
				<div class="ai-review-stats">
					<div class="ai-review-count">{aiState.appliedChanges}</div>
					<div class="ai-review-label">de {totalSuggestions} aplicadas</div>
				</div>
				
				<div class="ai-review-progress">
					<svg viewBox="0 0 36 36" class="ai-progress-ring">
						<path
							d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
							fill="none"
							stroke="rgba(255,255,255,0.3)"
							stroke-width="2"
						/>
						<path
							d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
							fill="none"
							stroke="white"
							stroke-width="2"
							stroke-dasharray="{percentage}, 100"
						/>
					</svg>
					<div class="ai-progress-text">
						<span>{percentage}%</span>
					</div>
				</div>
				
				{#if aiState.pendingChanges > 0}
					<button
						onclick={applyAllSuggestions}
						class="ai-btn ai-btn-apply"
						title="Aplicar todas as sugestões restantes"
					>
						✓ Aplicar Todas ({aiState.pendingChanges})
					</button>
					
					<button
						onclick={rejectAllSuggestions}
						class="ai-btn ai-btn-reject"
						title="Rejeitar todas as sugestões restantes"
					>
						✗ Rejeitar Todas
					</button>
				{:else}
					<button
						onclick={finishReview}
						class="ai-btn ai-btn-finish"
						title="Finalizar revisão IA"
					>
						🎉 Finalizar Revisão
					</button>
				{/if}
				
				<button
					onclick={cancelReview}
					class="ai-btn ai-btn-cancel"
				>
					Cancelar Revisão
				</button>
			</div>
		</div>
		
		<!-- Progresso da Revisão -->
		<div class="ai-review-footer">
			<div class="ai-review-progress-info">
				<span>Progresso da Revisão</span>
				<span>
					{#if aiState.pendingChanges > 0}
						Restam {aiState.pendingChanges} sugestões
					{:else}
						Todas as sugestões foram processadas!
					{/if}
				</span>
			</div>
			<div class="ai-progress-bar">
				<div 
					class="ai-progress-fill"
					style="width: {percentage}%"
				></div>
			</div>
		</div>
	</div>
{/if}

<style>
	.ai-review-header {
		background: linear-gradient(135deg, #00BFB3, #00A89D);
		color: white;
		padding: 1.5rem;
		border-radius: 0.75rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 10px 25px -5px rgba(0, 191, 179, 0.25);
		border-left: 4px solid rgba(255, 255, 255, 0.3);
	}

	.ai-review-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.ai-review-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
		min-width: 300px;
	}

	.ai-review-icon {
		width: 3.5rem;
		height: 3.5rem;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.ai-review-text h3 {
		font-size: 1.375rem;
		font-weight: 700;
		margin: 0;
		color: white;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.ai-review-text p {
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.9rem;
		margin: 0.25rem 0 0 0;
		font-weight: 400;
		line-height: 1.4;
	}

	.ai-review-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.ai-review-stats {
		text-align: center;
		min-width: 80px;
	}

	.ai-review-count {
		font-size: 1.75rem;
		font-weight: 800;
		color: white;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.ai-review-label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 500;
		margin-top: 0.25rem;
	}

	.ai-review-progress {
		width: 4rem;
		height: 4rem;
		position: relative;
	}

	.ai-progress-ring {
		width: 4rem;
		height: 4rem;
		transform: rotate(-90deg);
	}

	.ai-progress-text {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: 700;
		color: white;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.ai-btn {
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		transition: all 0.2s ease;
		font-size: 0.875rem;
		font-weight: 600;
		border: 1px solid rgba(255, 255, 255, 0.25);
		cursor: pointer;
		white-space: nowrap;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.ai-btn-apply,
	.ai-btn-reject {
		background: rgba(255, 255, 255, 0.15);
		color: white;
		backdrop-filter: blur(10px);
	}

	.ai-btn-apply:hover,
	.ai-btn-reject:hover {
		background: rgba(255, 255, 255, 0.25);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.ai-btn-finish {
		background: rgba(76, 175, 80, 0.8);
		color: white;
		backdrop-filter: blur(10px);
		border-color: rgba(76, 175, 80, 0.5);
	}

	.ai-btn-finish:hover {
		background: rgba(76, 175, 80, 0.9);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
	}

	.ai-btn-cancel {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		backdrop-filter: blur(10px);
	}

	.ai-btn-cancel:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.ai-review-footer {
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
	}

	.ai-review-progress-info {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 0.75rem;
		font-weight: 500;
	}

	.ai-progress-bar {
		width: 100%;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 9999px;
		height: 0.625rem;
		overflow: hidden;
	}

	.ai-progress-fill {
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
		height: 0.625rem;
		border-radius: 9999px;
		transition: width 0.5s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	/* Responsividade */
	@media (max-width: 768px) {
		.ai-review-content {
			flex-direction: column;
			align-items: stretch;
		}
		
		.ai-review-info {
			min-width: auto;
		}
		
		.ai-review-actions {
			justify-content: center;
			margin-top: 1rem;
		}
		
		.ai-btn {
			flex: 1;
			min-width: 0;
		}
	}
</style> 