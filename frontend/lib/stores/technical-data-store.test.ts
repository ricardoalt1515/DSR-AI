import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import type { TableSection } from "@/lib/types/technical-data";

type ProjectDataAPI = typeof import("@/lib/api/project-data")["projectDataAPI"];
type TechnicalDataStore =
	typeof import("./technical-data-store")["useTechnicalDataStore"];

const PROJECT_ID = "project-1";

const baselineSections: TableSection[] = [
	{
		id: "general",
		title: "General",
		fields: [
			{
				id: "design-flow",
				label: "Design flow",
				type: "number",
				value: 120,
				required: false,
				importance: "optional",
				source: "manual",
			},
		],
	},
];

let projectDataAPI: ProjectDataAPI | null = null;
let useTechnicalDataStore: TechnicalDataStore | null = null;
let maxVersions = 0;
let originalGetData: ProjectDataAPI["getData"] | null = null;

const getProjectDataAPI = (): ProjectDataAPI => {
	if (projectDataAPI === null) {
		throw new Error("projectDataAPI not initialized");
	}
	return projectDataAPI;
};

const getTechnicalDataStore = (): TechnicalDataStore => {
	if (useTechnicalDataStore === null) {
		throw new Error("useTechnicalDataStore not initialized");
	}
	return useTechnicalDataStore;
};

const getOriginalGetData = (): ProjectDataAPI["getData"] => {
	if (originalGetData === null) {
		throw new Error("originalGetData not initialized");
	}
	return originalGetData;
};

beforeAll(async () => {
	process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000";
	const projectDataModule = await import("@/lib/api/project-data");
	projectDataAPI = projectDataModule.projectDataAPI;
	originalGetData = projectDataModule.projectDataAPI.getData;

	const technicalDataStoreModule = await import("./technical-data-store");
	useTechnicalDataStore = technicalDataStoreModule.useTechnicalDataStore;
	maxVersions = technicalDataStoreModule.MAX_VERSIONS;
});

afterEach(() => {
	getProjectDataAPI().getData = getOriginalGetData();
	getTechnicalDataStore().setState({
		technicalData: {},
		versions: {},
		loading: false,
		error: null,
		loadSeqByProject: {},
	});
});

describe("technical-data-store fail-soft behavior", () => {
	it("does not blank sections when load fails", async () => {
		getTechnicalDataStore().setState({
			technicalData: { [PROJECT_ID]: baselineSections },
		});

		getProjectDataAPI().getData = async () => {
			throw new Error("network down");
		};

		await getTechnicalDataStore().getState().loadTechnicalData(PROJECT_ID);

		const state = getTechnicalDataStore().getState();
		expect(state.technicalData[PROJECT_ID]).toEqual(baselineSections);
		expect(state.error).toContain("network down");
	});

	it("clears stale local sections when backend returns empty sections", async () => {
		getTechnicalDataStore().setState({
			technicalData: { [PROJECT_ID]: baselineSections },
		});

		getProjectDataAPI().getData = async () => ({ technical_sections: [] });

		await getTechnicalDataStore().getState().loadTechnicalData(PROJECT_ID);

		const state = getTechnicalDataStore().getState();
		expect(state.technicalData[PROJECT_ID]).toEqual([]);
		expect(state.error).toBeNull();
	});

	it("caps versions to MAX_VERSIONS in memory", () => {
		getTechnicalDataStore().setState({
			technicalData: { [PROJECT_ID]: baselineSections },
			versions: {},
		});

		for (let index = 0; index < 30; index += 1) {
			getTechnicalDataStore()
				.getState()
				.saveSnapshot(PROJECT_ID, { label: `v${index}`, source: "manual" });
		}

		const versions =
			getTechnicalDataStore().getState().versions[PROJECT_ID] ?? [];
		expect(versions).toHaveLength(maxVersions);
	});
});
