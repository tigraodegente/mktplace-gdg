export function useDebounce<T extends (...args: any[]) => any>(
	fn: T,
	delay: number = 300
): T {
	let timeoutId: ReturnType<typeof setTimeout>;
	
	return ((...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		
		timeoutId = setTimeout(() => {
			fn(...args);
		}, delay);
	}) as T;
} 