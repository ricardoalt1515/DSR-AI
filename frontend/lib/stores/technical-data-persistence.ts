import type { StateStorage } from "zustand/middleware";
import { logger } from "@/lib/utils/logger";

export const TECHNICAL_DATA_STORE_KEY = "technical-data-store";
export const LEGACY_TECHNICAL_DATA_STORE_KEY = "h2o-technical-data-store";
const TECHNICAL_SHEET_DATA_PREFIX = "technical-sheet-data:";

type TechnicalStorageEvent =
	| "quota_exceeded"
	| "storage_read_failed"
	| "storage_write_failed"
	| "migration_read_legacy"
	| "migration_write_new"
	| "migration_cleanup_legacy"
	| "migration_parse_failed";

type StorageSizeBucket =
	| "unknown"
	| "tiny"
	| "small"
	| "medium"
	| "large"
	| "xlarge"
	| "xxlarge";

interface StorageEventMetadata {
	key: string;
	sizeBucket: StorageSizeBucket;
	reason?: string;
}

const INFO_EVENTS: ReadonlySet<TechnicalStorageEvent> = new Set([
	"migration_read_legacy",
	"migration_write_new",
	"migration_cleanup_legacy",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getSizeBucket = (value?: string): StorageSizeBucket => {
	if (typeof value !== "string") return "unknown";
	const size = value.length;
	if (size < 1_024) return "tiny";
	if (size < 10_240) return "small";
	if (size < 102_400) return "medium";
	if (size < 512_000) return "large";
	if (size < 1_048_576) return "xlarge";
	return "xxlarge";
};

const emitStorageEvent = (
	event: TechnicalStorageEvent,
	metadata: StorageEventMetadata,
	error?: unknown,
): void => {
	const payload = { ...metadata, ...(error !== undefined ? { error } : {}) };
	if (error === undefined) {
		const serializedPayload = `${event} ${JSON.stringify(payload)}`;
		if (INFO_EVENTS.has(event)) {
			logger.info(serializedPayload, undefined, "TechnicalDataStorage");
			return;
		}
		logger.warn(serializedPayload, "TechnicalDataStorage");
		return;
	}
	logger.error(event, payload, "TechnicalDataStorage");
};

const isQuotaExceededError = (error: unknown): boolean => {
	if (!(error instanceof Error)) return false;
	if (error.name === "QuotaExceededError") return true;
	if (error.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
	if (
		typeof DOMException !== "undefined" &&
		error instanceof DOMException &&
		error.code === 22
	) {
		return true;
	}
	return false;
};

const parsePersistedPayload = (
	key: string,
	rawValue: string,
	parseFailedEvent?: TechnicalStorageEvent,
): { state: Record<string, unknown>; version?: number } | null => {
	try {
		const parsed = JSON.parse(rawValue);
		if (!isRecord(parsed) || !isRecord(parsed.state)) {
			if (parseFailedEvent)
				emitStorageEvent(parseFailedEvent, {
					key,
					sizeBucket: getSizeBucket(rawValue),
					reason: "invalid_shape",
				});
			return null;
		}

		const technicalData = parsed.state.technicalData;
		if (!isRecord(technicalData)) {
			if (parseFailedEvent)
				emitStorageEvent(parseFailedEvent, {
					key,
					sizeBucket: getSizeBucket(rawValue),
					reason: "invalid_technical_data",
				});
			return null;
		}

		const nextState: Record<string, unknown> = { technicalData };
		const version =
			typeof parsed.version === "number" ? parsed.version : undefined;

		if (version === undefined) {
			return { state: nextState };
		}

		return { state: nextState, version };
	} catch (error) {
		if (parseFailedEvent) {
			emitStorageEvent(
				parseFailedEvent,
				{ key, sizeBucket: getSizeBucket(rawValue), reason: "parse_error" },
				error,
			);
		}
		return null;
	}
};

const safeReadItem = (storage: Storage, key: string): string | null => {
	try {
		return storage.getItem(key);
	} catch (error) {
		emitStorageEvent(
			"storage_read_failed",
			{ key, sizeBucket: "unknown", reason: "read_error" },
			error,
		);
		return null;
	}
};

const safeWriteItem = (
	storage: Storage,
	key: string,
	value: string,
): boolean => {
	try {
		storage.setItem(key, value);
		return true;
	} catch (error) {
		if (isQuotaExceededError(error)) {
			emitStorageEvent(
				"quota_exceeded",
				{ key, sizeBucket: getSizeBucket(value), reason: "quota_exceeded" },
				error,
			);
			return false;
		}
		emitStorageEvent(
			"storage_write_failed",
			{ key, sizeBucket: getSizeBucket(value), reason: "write_error" },
			error,
		);
		return false;
	}
};

const safeRemoveItem = (storage: Storage, key: string): boolean => {
	try {
		storage.removeItem(key);
		return true;
	} catch (error) {
		emitStorageEvent(
			"storage_write_failed",
			{ key, sizeBucket: "unknown", reason: "remove_error" },
			error,
		);
		return false;
	}
};

const readTechnicalDataState = (
	storage: Storage,
	key: string,
): string | null => {
	const rawCurrent = safeReadItem(storage, key);
	if (rawCurrent !== null) {
		const parsedCurrent = parsePersistedPayload(key, rawCurrent);
		if (parsedCurrent !== null) {
			return JSON.stringify(parsedCurrent);
		}
		emitStorageEvent("storage_read_failed", {
			key,
			sizeBucket: getSizeBucket(rawCurrent),
			reason: "invalid_persisted_payload",
		});
	}

	const rawLegacy = safeReadItem(storage, LEGACY_TECHNICAL_DATA_STORE_KEY);
	if (rawLegacy === null) {
		return null;
	}

	emitStorageEvent("migration_read_legacy", {
		key: LEGACY_TECHNICAL_DATA_STORE_KEY,
		sizeBucket: getSizeBucket(rawLegacy),
		reason: "fallback_read",
	});
	const parsedLegacy = parsePersistedPayload(
		LEGACY_TECHNICAL_DATA_STORE_KEY,
		rawLegacy,
		"migration_parse_failed",
	);
	if (parsedLegacy === null) {
		return null;
	}

	const migratedRaw = JSON.stringify(parsedLegacy);
	const writeOk = safeWriteItem(storage, TECHNICAL_DATA_STORE_KEY, migratedRaw);
	if (writeOk) {
		emitStorageEvent("migration_write_new", {
			key: TECHNICAL_DATA_STORE_KEY,
			sizeBucket: getSizeBucket(migratedRaw),
			reason: "migration_success",
		});
		const cleanupOk = safeRemoveItem(storage, LEGACY_TECHNICAL_DATA_STORE_KEY);
		if (cleanupOk) {
			emitStorageEvent("migration_cleanup_legacy", {
				key: LEGACY_TECHNICAL_DATA_STORE_KEY,
				sizeBucket: "unknown",
				reason: "migration_success",
			});
		}
	}

	return migratedRaw;
};

export const clearTechnicalStorageKeysFromStorage = (
	storage: Storage,
): void => {
	const keysToRemove = new Set<string>([
		TECHNICAL_DATA_STORE_KEY,
		LEGACY_TECHNICAL_DATA_STORE_KEY,
	]);

	try {
		for (let index = 0; index < storage.length; index += 1) {
			const key = storage.key(index);
			if (key?.startsWith(TECHNICAL_SHEET_DATA_PREFIX)) {
				keysToRemove.add(key);
			}
		}
	} catch (error) {
		emitStorageEvent(
			"storage_read_failed",
			{
				key: TECHNICAL_DATA_STORE_KEY,
				sizeBucket: "unknown",
				reason: "scan_keys_failed",
			},
			error,
		);
	}

	for (const key of keysToRemove) {
		safeRemoveItem(storage, key);
	}
};

export const clearTechnicalStorageKeys = (): void => {
	if (typeof window === "undefined") return;
	clearTechnicalStorageKeysFromStorage(window.localStorage);
};

export const createTechnicalDataStateStorage = (
	storage: Storage,
): StateStorage => ({
	getItem: (name) => readTechnicalDataState(storage, name),
	setItem: (name, value) => {
		safeWriteItem(storage, name, value);
	},
	removeItem: (name) => {
		safeRemoveItem(storage, name);
	},
});
