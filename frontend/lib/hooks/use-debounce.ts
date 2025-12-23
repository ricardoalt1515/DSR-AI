import { useEffect, useState } from "react";
import { DEBOUNCE } from "@/lib/constants/timings";

/**
 * ✅ Hook para debounce - previene múltiples actualizaciones rápidas
 *
 * @param value - Valor a debounce
 * @param delay - Delay en ms (default: 500ms)
 * @returns Valor debounced
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 300)
 *
 * useEffect(() => {
 *   // Solo ejecuta cuando el usuario deja de escribir por 300ms
 *   fetchResults(debouncedSearch)
 * }, [debouncedSearch])
 * ```
 */
export function useDebounce<T>(value: T, delay: number = DEBOUNCE.SEARCH): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		// Set timeout para actualizar el valor después del delay
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		// Cleanup: cancela el timeout si value cambia antes del delay
		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

// Alias for consistent naming
export const useDebouncedValue = useDebounce;
