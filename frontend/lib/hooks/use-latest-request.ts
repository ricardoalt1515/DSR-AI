import { useCallback, useRef } from "react";

export function useLatestRequest() {
	const requestIdRef = useRef(0);

	const startRequest = useCallback(() => {
		requestIdRef.current += 1;
		return requestIdRef.current;
	}, []);

	const isLatest = useCallback(
		(requestId: number) => requestId === requestIdRef.current,
		[],
	);

	const invalidate = useCallback(() => {
		requestIdRef.current += 1;
	}, []);

	return { startRequest, isLatest, invalidate };
}
