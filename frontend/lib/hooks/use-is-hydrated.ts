import { useEffect, useState } from "react";

/**
 * Returns true after the component has hydrated on the client.
 * Use this to prevent SSR hydration mismatches with Zustand stores.
 *
 * @example
 * const isHydrated = useIsHydrated();
 * const data = isHydrated ? store.getData() : defaultData;
 */
export function useIsHydrated(): boolean {
	const [isHydrated, setIsHydrated] = useState(false);
	useEffect(() => {
		setIsHydrated(true);
	}, []);
	return isHydrated;
}
