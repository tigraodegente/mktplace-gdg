<script lang="ts">
	import { onMount } from 'svelte';
	
	interface OfferCountdownProps {
		endTime?: Date;
		text?: string;
		class?: string;
	}
	
	let { 
		endTime = new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas por padrão
		text = 'Ofertas terminam em:',
		class: className = ''
	}: OfferCountdownProps = $props();
	
	// State
	let timeLeft = $state({
		hours: 0,
		minutes: 0,
		seconds: 0
	});
	
	let isActive = $state(true);
	let interval: ReturnType<typeof setInterval>;
	
	onMount(() => {
		updateTimer();
		interval = setInterval(updateTimer, 1000);
		
		return () => {
			clearInterval(interval);
		};
	});
	
	function updateTimer() {
		const now = new Date().getTime();
		const end = endTime.getTime();
		const difference = end - now;
		
		if (difference > 0) {
			const hours = Math.floor(difference / (1000 * 60 * 60));
			const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
			const seconds = Math.floor((difference % (1000 * 60)) / 1000);
			
			timeLeft = {
				hours: Math.min(hours, 99), // Limitando a 99 horas para caber no display
				minutes,
				seconds
			};
		} else {
			timeLeft = { hours: 0, minutes: 0, seconds: 0 };
			isActive = false;
			clearInterval(interval);
		}
	}
	
	function formatTime(time: number): string {
		return time.toString().padStart(2, '0');
	}
</script>

<div class="offer-countdown {className}" class:offer-countdown--inactive={!isActive}>
	<div class="offer-countdown__container">
		<!-- Texto da oferta -->
		<span class="offer-countdown__text">{text}</span>
		
		<!-- Contadores -->
		<div class="offer-countdown__timers">
			<!-- Horas -->
			<div class="offer-countdown__timer">
				<span class="offer-countdown__number">{formatTime(timeLeft.hours)}</span>
			</div>
			
			<!-- Separador -->
			<span class="offer-countdown__separator">:</span>
			
			<!-- Minutos -->
			<div class="offer-countdown__timer">
				<span class="offer-countdown__number">{formatTime(timeLeft.minutes)}</span>
			</div>
			
			<!-- Separador -->
			<span class="offer-countdown__separator">:</span>
			
			<!-- Segundos -->
			<div class="offer-countdown__timer">
				<span class="offer-countdown__number">{formatTime(timeLeft.seconds)}</span>
			</div>
		</div>
	</div>
</div>

<style>
	/* Container principal */
	.offer-countdown {
		width: 100%;
		background: #000;
		opacity: 0.8;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.offer-countdown__container {
		width: 100%;
		max-width: 1115px;
		height: 48px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 0 16px;
		flex-wrap: nowrap;
		white-space: nowrap;
	}
	
	/* Texto da oferta */
	.offer-countdown__text {
		width: 156px;
		height: 20px;
		flex-shrink: 0;
		color: #FFF;
		font-family: 'Lato', sans-serif;
		font-size: 15.444px;
		font-style: normal;
		font-weight: 600;
		line-height: normal;
		letter-spacing: 0.309px;
		display: flex;
		align-items: center;
		white-space: nowrap;
	}
	
	/* Container dos timers */
	.offer-countdown__timers {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
		flex-wrap: nowrap;
	}
	
	/* Cada caixa do timer */
	.offer-countdown__timer {
		width: 35.281px;
		height: 31.447px;
		flex-shrink: 0;
		border-radius: 6.136px;
		border: 0.767px solid #DCDCDC;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
	}
	
	/* Números dentro das caixas */
	.offer-countdown__number {
		width: 23px;
		height: 14px;
		flex-shrink: 0;
		color: #FFF;
		font-family: 'Lato', sans-serif;
		font-size: 13.73px;
		font-style: normal;
		font-weight: 500;
		line-height: normal;
		letter-spacing: -0.686px;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	/* Separadores (:) */
	.offer-countdown__separator {
		color: #FFF;
		font-family: 'Lato', sans-serif;
		font-size: 16px;
		font-weight: 600;
		margin: 0 2px;
	}
	
	/* Estado inativo quando o timer acaba */
	.offer-countdown--inactive {
		opacity: 0.4;
	}
	
	.offer-countdown--inactive .offer-countdown__timer {
		border-color: #666;
	}
	
	/* Responsividade para mobile */
	@media (max-width: 768px) {
		.offer-countdown__container {
			max-width: 100%;
			gap: 10px;
			padding: 0 8px;
			flex-wrap: nowrap; /* Força uma linha só no mobile */
		}
		
		.offer-countdown__text {
			width: auto;
			min-width: 120px; /* Largura mínima para não quebrar */
			font-size: 14px;
			letter-spacing: 0.2px;
			flex-shrink: 0;
			white-space: nowrap;
		}
		
		.offer-countdown__timer {
			width: 30px;
			height: 26px;
			border-radius: 5px;
			flex-shrink: 0;
		}
		
		.offer-countdown__number {
			font-size: 11px;
			width: 18px;
			height: 10px;
		}
		
		.offer-countdown__timers {
			gap: 4px;
			flex-shrink: 0;
		}
		
		.offer-countdown__separator {
			font-size: 14px;
			margin: 0 1px;
		}
	}
	
	/* Para telas muito pequenas */
	@media (max-width: 480px) {
		.offer-countdown__container {
			gap: 8px;
			padding: 0 4px;
		}
		
		.offer-countdown__text {
			font-size: 12px;
			min-width: 100px;
		}
		
		.offer-countdown__timer {
			width: 26px;
			height: 22px;
		}
		
		.offer-countdown__number {
			font-size: 10px;
			width: 16px;
			height: 8px;
		}
		
		.offer-countdown__timers {
			gap: 3px;
		}
		
		.offer-countdown__separator {
			font-size: 12px;
		}
	}
	
	/* Para telas extra pequenas (iPhone SE, etc) */
	@media (max-width: 375px) {
		.offer-countdown__container {
			gap: 6px;
			padding: 0 2px;
		}
		
		.offer-countdown__text {
			font-size: 11px;
			min-width: 85px;
			letter-spacing: 0.1px;
		}
		
		.offer-countdown__timer {
			width: 24px;
			height: 20px;
			border-radius: 4px;
		}
		
		.offer-countdown__number {
			font-size: 9px;
			width: 14px;
			height: 7px;
			letter-spacing: -0.3px;
		}
		
		.offer-countdown__timers {
			gap: 2px;
		}
		
		.offer-countdown__separator {
			font-size: 10px;
			margin: 0;
		}
	}
</style> 