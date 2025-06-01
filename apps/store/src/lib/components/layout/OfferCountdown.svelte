<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	
	// =============================================================================
	// TYPES
	// =============================================================================
	
	interface TimeLeft {
		hours: number;
		minutes: number;
		seconds: number;
		totalSeconds: number;
	}
	
	interface OfferCountdownProps {
		endTime?: Date;
		text?: string;
		showDays?: boolean;
		autoHide?: boolean;
		pulse?: boolean;
		class?: string;
	}
	
	// =============================================================================
	// PROPS
	// =============================================================================
	
	let { 
		endTime = new Date(Date.now() + 24 * 60 * 60 * 1000),
		text = 'Ofertas terminam em:',
		showDays = false,
		autoHide = true,
		pulse = true,
		class: className = ''
	}: OfferCountdownProps = $props();
	
	// =============================================================================
	// STATE
	// =============================================================================
	
	let timeLeft = $state<TimeLeft>({
		hours: 0,
		minutes: 0,
		seconds: 0,
		totalSeconds: 0
	});
	
	let isActive = $state(true);
	let isVisible = $state(true);
	let isPaused = $state(false);
	
	// =============================================================================
	// VARIABLES
	// =============================================================================
	
	let interval: ReturnType<typeof setInterval> | null = null;
	let animationFrameId: number | null = null;
	
	// =============================================================================
	// DERIVED
	// =============================================================================
	
	let isExpired = $derived(timeLeft.totalSeconds <= 0);
	let isUrgent = $derived(timeLeft.totalSeconds <= 300); // 5 minutos
	let isCritical = $derived(timeLeft.totalSeconds <= 60); // 1 minuto
	let days = $derived(showDays ? Math.floor(timeLeft.hours / 24) : 0);
	let displayHours = $derived(showDays ? timeLeft.hours % 24 : timeLeft.hours);
	
	// =============================================================================
	// EVENTS
	// =============================================================================
	
	const dispatch = createEventDispatcher<{
		expired: void;
		urgent: { secondsLeft: number };
		critical: { secondsLeft: number };
		tick: TimeLeft;
		pause: void;
		resume: void;
	}>();
	
	// =============================================================================
	// FUNCTIONS
	// =============================================================================
	
	function calculateTimeLeft(): TimeLeft {
		const now = Date.now();
		const end = endTime.getTime();
		const difference = Math.max(0, end - now);
		
		if (difference === 0) {
			return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
		}
		
		const totalSeconds = Math.floor(difference / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		
		return {
			hours: Math.min(hours, 999), // Máximo 999 horas
			minutes,
			seconds,
			totalSeconds
		};
	}
	
	function updateTimer() {
		if (isPaused) return;
		
		const newTimeLeft = calculateTimeLeft();
		const wasExpired = isExpired;
		const wasUrgent = isUrgent;
		const wasCritical = isCritical;
		
		timeLeft = newTimeLeft;
		
		// Dispatch events
		dispatch('tick', newTimeLeft);
		
		if (newTimeLeft.totalSeconds <= 0) {
			if (!wasExpired) {
				dispatch('expired');
				handleExpiration();
			}
		} else {
			if (!wasCritical && isCritical) {
				dispatch('critical', { secondsLeft: newTimeLeft.totalSeconds });
			} else if (!wasUrgent && isUrgent) {
				dispatch('urgent', { secondsLeft: newTimeLeft.totalSeconds });
			}
		}
	}
	
	function handleExpiration() {
		isActive = false;
		
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
		
		if (autoHide) {
			setTimeout(() => {
				isVisible = false;
			}, 2000);
		}
	}
	
	function pause() {
		isPaused = true;
		dispatch('pause');
	}
	
	function resume() {
		isPaused = false;
		dispatch('resume');
	}
	
	function formatTime(time: number): string {
		return time.toString().padStart(2, '0');
	}
	
	function formatDays(days: number): string {
		return days.toString().padStart(2, '0');
	}
	
	// =============================================================================
	// LIFECYCLE
	// =============================================================================
	
	onMount(() => {
		updateTimer();
		
		// Use setInterval for precise timing
		interval = setInterval(updateTimer, 1000);
		
		return () => {
			if (interval) {
				clearInterval(interval);
			}
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	});
	
	onDestroy(() => {
		if (interval) {
			clearInterval(interval);
		}
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	});
</script>

{#if isVisible}
	<div 
		class="countdown {className}"
		class:countdown--expired={isExpired}
		class:countdown--urgent={isUrgent && !isExpired}
		class:countdown--critical={isCritical && !isExpired}
		class:countdown--pulse={pulse && isActive}
		class:countdown--paused={isPaused}
		role="timer"
		aria-live="polite"
		aria-label="Contador de ofertas"
	>
		<div class="countdown__container">
			<span class="countdown__text">{text}</span>
			
			<div class="countdown__timers">
				{#if showDays && days > 0}
					<div class="countdown__unit">
						<span class="countdown__number">{formatDays(days)}</span>
						<span class="countdown__label">d</span>
					</div>
					<span class="countdown__separator">:</span>
				{/if}
				
				<div class="countdown__unit">
					<span class="countdown__number">{formatTime(displayHours)}</span>
					<span class="countdown__label">h</span>
				</div>
				
				<span class="countdown__separator">:</span>
				
				<div class="countdown__unit">
					<span class="countdown__number">{formatTime(timeLeft.minutes)}</span>
					<span class="countdown__label">m</span>
				</div>
				
				<span class="countdown__separator">:</span>
				
				<div class="countdown__unit">
					<span class="countdown__number">{formatTime(timeLeft.seconds)}</span>
					<span class="countdown__label">s</span>
				</div>
			</div>
			
			{#if isExpired}
				<span class="countdown__expired-text">Oferta expirada</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* =============================================================================
	   CSS CUSTOM PROPERTIES
	   ============================================================================= */
	
	.countdown {
		/* Colors */
		--color-bg: #000000;
		--color-text: #FFFFFF;
		--color-border: #DCDCDC;
		--color-border-urgent: #FF8403;
		--color-border-critical: #FF4444;
		--color-expired: #666666;
		
		/* Spacing */
		--spacing-xs: 4px;
		--spacing-sm: 8px;
		--spacing-md: 12px;
		--spacing-lg: 16px;
		
		/* Dimensions */
		--container-height: 48px;
		--unit-width: 35.281px;
		--unit-height: 31.447px;
		--border-radius: 6.136px;
		--border-width: 0.767px;
		
		/* Typography */
		--font-family: 'Lato', sans-serif;
		--font-size-text: 15.444px;
		--font-size-number: 13.73px;
		--font-size-separator: 16px;
		--font-size-label: 10px;
		--font-weight-text: 600;
		--font-weight-number: 500;
		--letter-spacing-text: 0.309px;
		--letter-spacing-number: -0.686px;
		
		/* Transitions */
		--transition-base: 0.3s ease;
		--transition-border: border-color var(--transition-base);
		--transition-color: color var(--transition-base);
		--transition-opacity: opacity var(--transition-base);
		
		/* Animations */
		--pulse-duration: 2s;
		--shake-duration: 0.5s;
	}
	
	/* =============================================================================
	   BASE STYLES
	   ============================================================================= */
	
	.countdown {
		width: 100%;
		background-color: var(--color-bg);
		display: flex;
		justify-content: center;
		align-items: center;
		transition: var(--transition-opacity);
		position: relative;
		z-index: 10; /* Abaixo de ambos os headers: desktop (100) e mobile (20) */
		/* Mobile: full width sem margin ou border radius */
		margin: 0;
		border-radius: 0;
		/* Garantir que não cause overflow horizontal */
		max-width: 100%;
		overflow: hidden;
		box-sizing: border-box;
	}
	
	/* Mobile e iPad Mini: até 899px - FLUXO NORMAL */
	@media (max-width: 899px) {
		.countdown {
			position: relative;
			margin: 0;
			border-radius: 0;
			box-shadow: none;
			max-width: 100%;
			z-index: 10; /* Abaixo do header mobile (z-20) */
			overflow: hidden;
			/* Garantir que ocupe apenas o espaço necessário */
			min-height: var(--container-height);
		}
	}
	
	/* Tablet médio: 900px - 1023px */
	@media (min-width: 900px) and (max-width: 1023px) {
		.countdown {
			position: relative;
			margin-top: 20px;
			margin-bottom: -24px;
			border-radius: 24px 24px 0 0;
			max-width: 95%;
			margin-left: auto;
			margin-right: auto;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
			z-index: 10; /* Abaixo do header desktop (z-100) */
			overflow: hidden;
		}
	}
	
	/* Desktop: 1024px+ */
	@media (min-width: 1024px) {
		.countdown {
			position: relative;
			margin-top: 48px;
			margin-bottom: 0;
			border-radius: 32px 32px 0 0;
			max-width: 1200px;
			margin-left: auto;
			margin-right: auto;
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
			z-index: 10; /* Abaixo do header desktop (z-100) */
			overflow: hidden;
		}
	}
	
	.countdown__container {
		width: 100%;
		max-width: 1200px;
		height: var(--container-height);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-lg);
		flex-wrap: nowrap;
		white-space: nowrap;
		/* Garantir que o conteúdo não ultrapasse os limites */
		overflow: hidden;
		box-sizing: border-box;
		padding: 0 var(--spacing-sm);
	}
	
	/* =============================================================================
	   TEXT ELEMENTS
	   ============================================================================= */
	
	.countdown__text {
		color: var(--color-text);
		font-family: var(--font-family);
		font-size: var(--font-size-text);
		font-weight: var(--font-weight-text);
		letter-spacing: var(--letter-spacing-text);
		line-height: 1;
		flex-shrink: 0;
		transition: var(--transition-color);
	}
	
	.countdown__expired-text {
		color: var(--color-expired);
		font-family: var(--font-family);
		font-size: var(--font-size-text);
		font-weight: var(--font-weight-text);
		font-style: italic;
		margin-left: var(--spacing-sm);
	}
	
	/* =============================================================================
	   TIMER UNITS
	   ============================================================================= */
	
	.countdown__timers {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		flex-shrink: 0;
		/* Garantir que os timers não quebrem o layout */
		min-width: 0;
		overflow: visible;
	}
	
	.countdown__unit {
		position: relative;
		width: var(--unit-width);
		height: var(--unit-height);
		border-radius: var(--border-radius);
		border: var(--border-width) solid var(--color-border);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: transparent;
		transition: var(--transition-border);
		/* Garantir que as unidades não causem problemas */
		flex-shrink: 0;
		box-sizing: border-box;
	}
	
	.countdown__number {
		color: var(--color-text);
		font-family: var(--font-family);
		font-size: var(--font-size-number);
		font-weight: var(--font-weight-number);
		letter-spacing: var(--letter-spacing-number);
		line-height: 1;
		transition: var(--transition-color);
	}
	
	.countdown__label {
		color: var(--color-text);
		font-family: var(--font-family);
		font-size: var(--font-size-label);
		font-weight: 400;
		opacity: 0.7;
		position: absolute;
		bottom: 2px;
		right: 2px;
	}
	
	.countdown__separator {
		color: var(--color-text);
		font-family: var(--font-family);
		font-size: var(--font-size-separator);
		font-weight: var(--font-weight-text);
		margin: 0 2px;
		transition: var(--transition-color);
	}
	
	/* =============================================================================
	   STATES
	   ============================================================================= */
	
	.countdown--urgent .countdown__unit {
		border-color: var(--color-border-urgent);
		animation: pulse-border var(--pulse-duration) infinite;
	}
	
	.countdown--critical .countdown__unit {
		border-color: var(--color-border-critical);
		animation: shake var(--shake-duration) infinite, pulse-border 1s infinite;
	}
	
	.countdown--expired {
		opacity: 0.6;
	}
	
	.countdown--expired .countdown__unit {
		border-color: var(--color-expired);
	}
	
	.countdown--expired .countdown__text,
	.countdown--expired .countdown__number,
	.countdown--expired .countdown__separator {
		color: var(--color-expired);
	}
	
	.countdown--paused {
		opacity: 0.8;
	}
	
	.countdown--pulse .countdown__unit {
		animation: pulse var(--pulse-duration) infinite;
	}
	
	/* =============================================================================
	   ANIMATIONS
	   ============================================================================= */
	
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}
	
	@keyframes pulse-border {
		0%, 100% {
			border-color: var(--color-border-urgent);
		}
		50% {
			border-color: var(--color-border-critical);
		}
	}
	
	@keyframes shake {
		0%, 100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-2px);
		}
		75% {
			transform: translateX(2px);
		}
	}
	
	/* =============================================================================
	   RESPONSIVE BREAKPOINTS
	   ============================================================================= */
	
	/* Tablet: 768px - 1023px */
	@media (min-width: 768px) and (max-width: 1023px) {
		.countdown {
			--spacing-md: 10px;
			--spacing-lg: 14px;
			--unit-width: 32px;
			--unit-height: 28px;
			--font-size-text: 14.5px;
			--font-size-number: 12px;
		}
		
		.countdown__container {
			padding: 0 var(--spacing-md);
		}
	}
	
	/* Mobile: até 767px */
	@media (max-width: 767px) {
		.countdown {
			--container-height: 44px;
			--spacing-sm: 6px;
			--spacing-lg: 10px;
			--unit-width: 30px;
			--unit-height: 26px;
			--border-radius: 5px;
			--font-size-text: 14px;
			--font-size-number: 11px;
			--font-size-separator: 14px;
			--font-size-label: 9px;
			--letter-spacing-text: 0.2px;
		}
		
		.countdown__container {
			padding: 0 var(--spacing-sm);
			gap: var(--spacing-sm);
		}
		
		.countdown__timers {
			gap: var(--spacing-xs);
		}
		
		.countdown__separator {
			margin: 0 1px;
		}
		
		.countdown__text {
			flex-shrink: 1;
			min-width: 0;
		}
	}
	
	/* Mobile pequeno: até 480px */
	@media (max-width: 480px) {
		.countdown {
			--container-height: 42px;
			--spacing-sm: 4px;
			--spacing-lg: 8px;
			--unit-width: 26px;
			--unit-height: 22px;
			--border-width: 0.5px;
			--font-size-text: 12px;
			--font-size-number: 10px;
			--font-size-separator: 12px;
			--font-size-label: 8px;
		}
		
		.countdown__container {
			padding: 0 var(--spacing-xs);
			gap: var(--spacing-xs);
		}
		
		.countdown__timers {
			gap: 3px;
		}
		
		.countdown__text {
			font-size: 11px;
		}
	}
	
	/* Mobile extra pequeno: até 375px */
	@media (max-width: 375px) {
		.countdown {
			--container-height: 40px;
			--spacing-lg: 6px;
			--unit-width: 24px;
			--unit-height: 20px;
			--border-radius: 4px;
			--font-size-text: 11px;
			--font-size-number: 9px;
			--font-size-separator: 10px;
			--font-size-label: 7px;
			--letter-spacing-text: 0.1px;
			--letter-spacing-number: -0.3px;
		}
		
		.countdown__container {
			padding: 0 2px;
			gap: 4px;
		}
		
		.countdown__timers {
			gap: 2px;
		}
		
		.countdown__separator {
			margin: 0;
		}
		
		.countdown__text {
			font-size: 10px;
			letter-spacing: 0;
		}
	}
</style> 