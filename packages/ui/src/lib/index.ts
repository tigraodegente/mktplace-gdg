// Componentes básicos
export { default as Button } from './Button.svelte';
export { default as Card } from './Card.svelte';
export { default as Input } from './Input.svelte';
export { default as Modal } from './Modal.svelte';
export { default as Toast } from './Toast.svelte';
export { default as Dropdown } from './Dropdown.svelte';
export { default as Skeleton } from './Skeleton.svelte';
export { default as EmptyState } from './EmptyState.svelte';
export { default as Select } from './components/Select.svelte';

// Auth components
export { default as UnifiedLogin } from './components/auth/UnifiedLogin.svelte';

// Layout components  
export { default as AdminHeader } from './components/layout/AdminHeader.svelte';
export { default as Layout } from './components/layout/Layout.svelte';
export { default as Header } from './components/layout/Header.svelte';
export { default as Navigation } from './components/layout/Navigation.svelte';
export { default as ProfessionalHeader } from './components/layout/ProfessionalHeader.svelte';

// Rich Admin Components (novos)
export { default as RichDataTable } from './components/admin/RichDataTable.svelte';
export { default as RichStatsCard } from './components/admin/RichStatsCard.svelte';
export { default as RichModal } from './components/admin/RichModal.svelte';
export { default as RichPageHeader } from './components/admin/RichPageHeader.svelte';

// Icon Components
export { default as IconSystem } from './components/icons/IconSystem.svelte';

// Auth service
export { createAuthStore, authService } from './services/auth'; 