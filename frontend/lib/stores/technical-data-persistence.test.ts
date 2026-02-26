import { describe, expect, it } from "bun:test";
import {
	clearTechnicalStorageKeysFromStorage,
	createTechnicalDataStateStorage,
	LEGACY_TECHNICAL_DATA_STORE_KEY,
	TECHNICAL_DATA_STORE_KEY,
} from "./technical-data-persistence";

class MemoryStorage implements Storage {
	private data = new Map<string, string>();
	public setCountByKey = new Map<string, number>();

	get length(): number {
		return this.data.size;
	}

	clear(): void {
		this.data.clear();
	}

	getItem(key: string): string | null {
		return this.data.get(key) ?? null;
	}

	key(index: number): string | null {
		return Array.from(this.data.keys())[index] ?? null;
	}

	removeItem(key: string): void {
		this.data.delete(key);
	}

	setItem(key: string, value: string): void {
		this.data.set(key, value);
		this.setCountByKey.set(key, (this.setCountByKey.get(key) ?? 0) + 1);
	}
}

class QuotaThrowingStorage extends MemoryStorage {
	override setItem(): void {
		const error = new Error("quota");
		error.name = "QuotaExceededError";
		throw error;
	}
}

const payload = (technicalData: Record<string, unknown>): string =>
	JSON.stringify({
		state: {
			technicalData,
			versions: { old: [1, 2, 3] },
		},
		version: 0,
	});

describe("technical-data-persistence", () => {
	it("migrates legacy key to new key preserving technicalData", () => {
		const storage = new MemoryStorage();
		storage.setItem(
			LEGACY_TECHNICAL_DATA_STORE_KEY,
			payload({ projectA: [{ id: "s1", fields: [] }] }),
		);

		const stateStorage = createTechnicalDataStateStorage(storage);
		const raw = stateStorage.getItem(TECHNICAL_DATA_STORE_KEY);

		expect(raw).not.toBeNull();
		const parsed = JSON.parse(raw ?? "{}");
		expect(parsed.state.technicalData.projectA).toBeDefined();
		expect(parsed.state.versions).toBeUndefined();
		expect(storage.getItem(TECHNICAL_DATA_STORE_KEY)).not.toBeNull();
		expect(storage.getItem(LEGACY_TECHNICAL_DATA_STORE_KEY)).toBeNull();
	});

	it("migration is idempotent", () => {
		const storage = new MemoryStorage();
		storage.setItem(
			LEGACY_TECHNICAL_DATA_STORE_KEY,
			payload({ projectA: [{ id: "s1", fields: [] }] }),
		);

		const stateStorage = createTechnicalDataStateStorage(storage);
		const first = stateStorage.getItem(TECHNICAL_DATA_STORE_KEY);
		const second = stateStorage.getItem(TECHNICAL_DATA_STORE_KEY);

		expect(first).toBe(second);
		expect(storage.setCountByKey.get(TECHNICAL_DATA_STORE_KEY)).toBe(1);
		expect(storage.getItem(LEGACY_TECHNICAL_DATA_STORE_KEY)).toBeNull();
	});

	it("global clear removes only technical keys", () => {
		const storage = new MemoryStorage();
		storage.setItem(TECHNICAL_DATA_STORE_KEY, payload({ p1: [] }));
		storage.setItem(LEGACY_TECHNICAL_DATA_STORE_KEY, payload({ p1: [] }));
		storage.setItem("technical-sheet-data:p1", "[]");
		storage.setItem("access_token", "token");
		storage.setItem("h2o-project-store", "project");

		clearTechnicalStorageKeysFromStorage(storage);

		expect(storage.getItem(TECHNICAL_DATA_STORE_KEY)).toBeNull();
		expect(storage.getItem(LEGACY_TECHNICAL_DATA_STORE_KEY)).toBeNull();
		expect(storage.getItem("technical-sheet-data:p1")).toBeNull();
		expect(storage.getItem("access_token")).toBe("token");
		expect(storage.getItem("h2o-project-store")).toBe("project");
	});

	it("setItem fail-soft on quota errors", () => {
		const storage = new QuotaThrowingStorage();
		const stateStorage = createTechnicalDataStateStorage(storage);

		expect(() => {
			stateStorage.setItem(TECHNICAL_DATA_STORE_KEY, payload({ p1: [] }));
		}).not.toThrow();
	});
});
