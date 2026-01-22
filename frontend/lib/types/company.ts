/**
 * Company and Location types matching backend schemas
 */

import type { Sector, Subsector } from "@/lib/sectors-config";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPANY TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CompanyBase {
	name: string;
	industry: string;
	sector: Sector;
	subsector: Subsector;
	contactName?: string;
	contactEmail?: string;
	contactPhone?: string;
	notes?: string;
	tags?: string[];
}

export interface CompanyCreate extends CompanyBase {}

export interface CompanyUpdate extends Partial<CompanyBase> {}

export interface CompanySummary extends CompanyBase {
	id: string;
	locationCount: number;
	createdAt: string;
	updatedAt: string;
	createdByUserId?: string;
	archivedAt?: string | null;
	archivedByUserId?: string | null;
}

export interface CompanyDetail extends CompanySummary {
	locations: LocationSummary[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCATION TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface LocationBase {
	name: string;
	city: string;
	state: string;
	address?: string;
	latitude?: number;
	longitude?: number;
	notes?: string;
}

export interface LocationCreate extends LocationBase {
	companyId: string;
}

export interface LocationUpdate extends Partial<LocationBase> {}

export interface LocationSummary extends LocationBase {
	id: string;
	companyId: string;
	fullAddress: string;
	projectCount: number;
	createdAt: string;
	updatedAt: string;
	createdByUserId?: string;
	archivedAt?: string | null;
	archivedByUserId?: string | null;
	archivedByParentId?: string | null;
}

export interface LocationDetail extends LocationSummary {
	company?: CompanySummary;
	projects?: Array<{
		id: string;
		name: string;
		status: string;
		createdAt: string;
	}>;
	contacts?: LocationContact[];
}

export interface LocationContact {
	id: string;
	locationId: string;
	name: string;
	email?: string;
	phone?: string;
	title?: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORM TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CompanyFormData {
	name: string;
	industry: string;
	sector: Sector;
	subsector: Subsector;
	contactName: string;
	contactEmail: string;
	contactPhone: string;
	notes?: string;
}

export interface LocationFormData {
	name: string;
	city: string;
	state: string;
	address: string;
	notes?: string;
}
