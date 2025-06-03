<script lang="ts">
  interface RatingProps {
    rating: number;
    maxRating?: number;
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
    reviewsCount?: number;
    class?: string;
  }

  let { 
    rating, 
    maxRating = 5, 
    size = 'md', 
    showValue = true,
    reviewsCount,
    class: className = ''
  }: RatingProps = $props();

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
</script>

<div class="flex items-center gap-1 {className}">
  <div class="flex gap-0.5">
    {#each Array(maxRating) as _, i}
      <svg 
        class="{sizeClasses[size]} {i < Math.floor(rating) ? 'text-[#00BFB3]' : 'text-gray-300'} transition-colors" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    {/each}
  </div>
  
  {#if showValue}
    <span class="{textSizeClasses[size]} text-gray-600 font-medium ml-1">
      {rating.toFixed(1)}
    </span>
  {/if}
  
  {#if reviewsCount !== undefined}
    <span class="{textSizeClasses[size]} text-gray-500">
      ({reviewsCount})
    </span>
  {/if}
</div> 