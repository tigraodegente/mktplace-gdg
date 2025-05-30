<script lang="ts">
  export let steps: string[];
  export let currentStep: string;
  export let stepLabels: Record<string, string>;
  export let onStepClick: (step: string) => void = () => {};
  
  function isStepCompleted(step: string): boolean {
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    return stepIndex < currentIndex;
  }
  
  function isStepActive(step: string): boolean {
    return step === currentStep;
  }
  
  function isStepClickable(step: string): boolean {
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    return stepIndex <= currentIndex;
  }
  
  function getStepNumber(step: string): number {
    return steps.indexOf(step) + 1;
  }
</script>

<div class="w-full">
  <div class="flex items-center">
    {#each steps as step, index}
      <div class="flex items-center flex-1">
        <!-- Círculo da Etapa -->
        <button
          class="relative flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all duration-200
                 {isStepActive(step) 
                   ? 'bg-blue-600 text-white ring-4 ring-blue-100' 
                   : isStepCompleted(step)
                     ? 'bg-green-500 text-white'
                     : 'bg-gray-300 text-gray-600'
                 }
                 {isStepClickable(step) ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}"
          on:click={() => isStepClickable(step) && onStepClick(step)}
          disabled={!isStepClickable(step)}
        >
          {#if isStepCompleted(step)}
            <!-- Check Icon -->
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          {:else}
            {getStepNumber(step)}
          {/if}
        </button>
        
        <!-- Label da Etapa -->
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium
                    {isStepActive(step) 
                      ? 'text-blue-600' 
                      : isStepCompleted(step)
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }">
            {stepLabels[step]}
          </p>
          {#if isStepActive(step)}
            <p class="text-xs text-gray-500">Etapa atual</p>
          {:else if isStepCompleted(step)}
            <p class="text-xs text-green-500">Concluído</p>
          {:else}
            <p class="text-xs text-gray-400">Pendente</p>
          {/if}
        </div>
      </div>
      
      <!-- Linha Conectora -->
      {#if index < steps.length - 1}
        <div class="flex-1 h-px mx-4 transition-colors duration-200
                    {isStepCompleted(steps[index + 1]) || isStepActive(steps[index + 1])
                      ? 'bg-blue-300'
                      : 'bg-gray-300'
                    }">
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  button:disabled {
    opacity: 0.6;
  }
</style> 