<script lang="ts">
  interface SkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
    class?: string;
    count?: number;
    spacing?: string;
  }
  
  let {
    variant = 'text',
    width = '100%',
    height = 'auto',
    animation = 'pulse',
    class: className = '',
    count = 1,
    spacing = '0.5rem'
  }: SkeletonProps = $props();
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg'
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: ''
  };
  
  const defaultHeights = {
    text: '1em',
    circular: width, // Make it square by default
    rectangular: '120px',
    rounded: '120px'
  };
  
  const computedHeight = $derived(height === 'auto' ? defaultHeights[variant] : height);
  const computedWidth = $derived(typeof width === 'number' ? `${width}px` : width);
  const computedHeightStr = $derived(typeof computedHeight === 'number' ? `${computedHeight}px` : computedHeight);
  
  const items = Array(count).fill(null);
</script>

<div class="skeleton-container {className}">
  {#each items as _, index}
    <div
      class="skeleton bg-gray-200 {variantClasses[variant]} {animationClasses[animation]}"
      style="width: {computedWidth}; height: {computedHeightStr}; {index > 0 ? `margin-top: ${spacing}` : ''}"
      role="status"
      aria-label="Loading..."
    >
      <span class="sr-only">Loading...</span>
    </div>
  {/each}
</div>

<style>
  .skeleton {
    position: relative;
    overflow: hidden;
  }
  
  /* Wave animation */
  :global(.skeleton-wave) {
    background: linear-gradient(
      90deg,
      #f0f0f0 25%,
      #e0e0e0 50%,
      #f0f0f0 75%
    );
    background-size: 200% 100%;
    animation: wave 1.5s infinite;
  }
  
  @keyframes wave {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  
  /* Screen reader only text */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style> 