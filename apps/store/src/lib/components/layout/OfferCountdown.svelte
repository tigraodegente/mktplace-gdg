<script lang="ts">
	import { onMount } from 'svelte';
	
	interface Props {
		endTime?: Date;
		text?: string;
		class?: string;
	}
	
	let { 
		endTime = new Date(Date.now() + 24 * 60 * 60 * 1000),
		text = 'Ofertas terminam em:',
		class: className = ''
	}: Props = $props();
	
	let timeLeft = $state({ h: 0, m: 0, s: 0 });
	let interval: ReturnType<typeof setInterval> | null = null;
	
	function updateTimer() {
		const diff = Math.max(0, endTime.getTime() - Date.now());
		if (diff === 0) return interval && clearInterval(interval);
		
		const total = Math.floor(diff / 1000);
		timeLeft = {
			h: Math.floor(total / 3600),
			m: Math.floor((total % 3600) / 60),
			s: total % 60
		};
	}
	
	onMount(() => {
		updateTimer();
		interval = setInterval(updateTimer, 1000);
		return () => interval && clearInterval(interval);
	});
</script>

<div class="countdown-wrapper {className}">
	<div class="countdown-container">
		<div class="countdown-content">
			<span class="countdown__text">{text}</span>
			<div class="countdown__timers">
				<div class="countdown__unit">
					<span class="countdown__number">{timeLeft.h.toString().padStart(2, '0')}</span>
					<span class="countdown__label">h</span>
				</div>
				<span class="countdown__separator">:</span>
				<div class="countdown__unit">
					<span class="countdown__number">{timeLeft.m.toString().padStart(2, '0')}</span>
					<span class="countdown__label">m</span>
				</div>
				<span class="countdown__separator">:</span>
				<div class="countdown__unit">
					<span class="countdown__number">{timeLeft.s.toString().padStart(2, '0')}</span>
					<span class="countdown__label">s</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Mesma estrutura do HomeBanner */
	.countdown-wrapper {
		position: relative;
		width: 100%;
		margin: 0 auto;
		max-width: 1440px; /* --container-max-width igual ao banner */
		overflow: hidden;
	}
	
	.countdown-container {
		position: relative;
		width: 100%;
		margin: 0 auto;
		background: #000;
		color: #fff;
		border-radius: 0;
		overflow: hidden;
	}
	
	.countdown-content {
		width: 100%;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 0 16px;
		box-sizing: border-box;
		font-family: 'Lato', sans-serif;
	}
	
	/* Quando conectado ao banner - remove margin para conexão visual */
	:global(.countdown-connected) .countdown-wrapper {
		margin-bottom: 0 !important;
	}
	
	/* Mobile ≤899px - EXATAMENTE IGUAL AO BANNER */
	@media (max-width: 899px) {
		.countdown-wrapper {
			padding: 0;
			margin: 0;
		}
		
		.countdown-container {
			border-radius: 0;
			margin: 0;
		}
		
		/* Quando conectado no mobile */
		:global(.countdown-connected) .countdown-wrapper {
			margin: 0 !important;
		}
	}
	
	/* Tablet 900px-1023px - EXATAMENTE IGUAL AO BANNER */
	@media (min-width: 900px) and (max-width: 1023px) {
		.countdown-wrapper {
			padding: 0 2.5vw;
			margin-top: 20px; /* Mesmo margin do banner tablet */
			margin-bottom: 0; /* Sem espaço na base para conectar com banner */
		}
		
		.countdown-container {
			border-radius: 24px 24px 0 0; /* --border-radius-md */
			margin: 0;
		}
		
		/* Quando conectado no tablet */
		:global(.countdown-connected) .countdown-wrapper {
			margin-top: 20px !important;
			margin-bottom: 0 !important;
		}
		
		:global(.countdown-connected) .countdown-container {
			margin-bottom: 0 !important;
		}
	}
	
	/* Desktop ≥1024px - EXATAMENTE IGUAL AO BANNER */
	@media (min-width: 1024px) {
		.countdown-wrapper {
			padding: 0 32px; /* --spacing-xl igual ao banner */
			margin-top: 48px; /* --banner-padding-top igual ao banner */
		}
		
		.countdown-container {
			max-width: calc(1440px - 64px); /* --banner-max-width */
			border-radius: 32px 32px 0 0; /* --border-radius-lg */
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
			margin: 0;
		}
		
		/* Quando conectado no desktop */
		:global(.countdown-connected) .countdown-wrapper {
			margin-top: 48px !important;
			margin-bottom: 0 !important;
		}
	}
	
	/* Elementos internos */
	.countdown__text { font-size: 15px; font-weight: 600; }
	.countdown__timers { display: flex; align-items: center; gap: 8px; }
	
	.countdown__unit {
		position: relative;
		width: 35px;
		height: 31px;
		border-radius: 6px;
		border: 1px solid #ddd;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	
	.countdown__number { font-size: 14px; font-weight: 500; }
	.countdown__label { font-size: 10px; opacity: 0.7; position: absolute; bottom: 2px; right: 2px; }
	.countdown__separator { font-size: 16px; font-weight: 600; margin: 0 2px; }
	
	@media (max-width: 640px) {
		.countdown__text { font-size: 13px; }
		.countdown__unit { width: 30px; height: 28px; }
		.countdown__number { font-size: 12px; }
		.countdown__label { font-size: 9px; }
		.countdown-content { gap: 12px; padding: 0 12px; }
		.countdown__timers { gap: 6px; }
	}
</style> 