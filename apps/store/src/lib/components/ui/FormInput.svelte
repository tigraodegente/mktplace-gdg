<script lang="ts">
  import { maskAction } from '$lib/utils/masks';
  import type { ValidationRule } from '$lib/utils/validation';
  
  interface FormInputProps {
    type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'date' | 'search';
    name: string;
    label?: string;
    placeholder?: string;
    value?: string | number;
    error?: string;
    touched?: boolean;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    mask?: (value: string) => string;
    icon?: 'user' | 'email' | 'lock' | 'phone' | 'search' | 'calendar';
    hint?: string;
    maxLength?: number;
    autocomplete?: string;
    class?: string;
    onInput?: (value: string) => void;
    onBlur?: () => void;
    onFocus?: () => void;
  }
  
  let {
    type = 'text',
    name,
    label = '',
    placeholder = '',
    value = $bindable(''),
    error = '',
    touched = false,
    required = false,
    disabled = false,
    readonly = false,
    mask,
    icon,
    hint = '',
    maxLength,
    autocomplete,
    class: className = '',
    onInput,
    onBlur,
    onFocus
  }: FormInputProps = $props();
  
  let inputRef = $state<HTMLInputElement>();
  let isFocused = $state(false);
  
  const hasError = $derived(touched && error);
  const showSuccess = $derived(touched && !error && value);
  
  function handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    value = input.value;
    onInput?.(input.value);
  }
  
  function handleBlur() {
    isFocused = false;
    onBlur?.();
  }
  
  function handleFocus() {
    isFocused = true;
    onFocus?.();
  }
  
  const iconPaths = {
    user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    email: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
    phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    calendar: 'M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z'
  };
</script>

<div class="form-input-wrapper {className}">
  {#if label}
    <label 
      for={name}
      class="form-input-label {required ? 'form-input-label--required' : ''}"
    >
      {label}
    </label>
  {/if}
  
  <div class="form-input-container {hasError ? 'form-input-container--error' : ''} {showSuccess ? 'form-input-container--success' : ''} {isFocused ? 'form-input-container--focused' : ''}">
    {#if icon}
      <div class="form-input-icon">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d={iconPaths[icon]} />
        </svg>
      </div>
    {/if}
    
    {#if mask}
      <input
        bind:this={inputRef}
        {type}
        {name}
        id={name}
        {placeholder}
        value={String(value)}
        {disabled}
        {readonly}
        {required}
        maxlength={maxLength}
        autocomplete={autocomplete as any}
        class="form-input {icon ? 'form-input--with-icon' : ''}"
        oninput={handleInput}
        onblur={handleBlur}
        onfocus={handleFocus}
        use:maskAction={mask}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError ? `${name}-error` : hint ? `${name}-hint` : undefined}
      />
    {:else}
      <input
        bind:this={inputRef}
        {type}
        {name}
        id={name}
        {placeholder}
        value={String(value)}
        {disabled}
        {readonly}
        {required}
        maxlength={maxLength}
        autocomplete={autocomplete as any}
        class="form-input {icon ? 'form-input--with-icon' : ''}"
        oninput={handleInput}
        onblur={handleBlur}
        onfocus={handleFocus}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError ? `${name}-error` : hint ? `${name}-hint` : undefined}
      />
    {/if}
    
    {#if hasError || showSuccess}
      <div class="form-input-status">
        {#if hasError}
          <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        {:else if showSuccess}
          <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        {/if}
      </div>
    {/if}
  </div>
  
  {#if hasError}
    <p id="{name}-error" class="form-input-error">
      {error}
    </p>
  {:else if hint && !touched}
    <p id="{name}-hint" class="form-input-hint">
      {hint}
    </p>
  {/if}
</div>

<style>
  .form-input-wrapper {
    @apply space-y-1;
  }
  
  .form-input-label {
    @apply block text-sm font-medium text-gray-700;
  }
  
  .form-input-label--required::after {
    content: ' *';
    @apply text-red-500;
  }
  
  .form-input-container {
    @apply relative rounded-md shadow-sm;
  }
  
  .form-input {
    @apply block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400;
    @apply focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent;
    @apply disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed;
    @apply transition-colors duration-200;
  }
  
  .form-input--with-icon {
    @apply pl-10;
  }
  
  .form-input-container--error .form-input {
    @apply border-red-300 text-red-900 placeholder-red-300;
    @apply focus:ring-red-500;
  }
  
  .form-input-container--success .form-input {
    @apply border-green-300;
    @apply focus:ring-green-500;
  }
  
  .form-input-icon {
    @apply absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none;
    @apply text-gray-400;
  }
  
  .form-input-container--error .form-input-icon {
    @apply text-red-500;
  }
  
  .form-input-container--success .form-input-icon {
    @apply text-green-500;
  }
  
  .form-input-status {
    @apply absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none;
  }
  
  .form-input-error {
    @apply mt-1 text-sm text-red-600;
  }
  
  .form-input-hint {
    @apply mt-1 text-sm text-gray-500;
  }
  
  /* Animação de shake para erro */
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
    20%, 40%, 60%, 80% { transform: translateX(2px); }
  }
  
  .form-input-container--error {
    animation: shake 0.5s ease-in-out;
  }
</style> 