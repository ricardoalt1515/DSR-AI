import { toast } from "sonner";
import { APIClientError, isForbiddenError } from "@/lib/api/client";
import type {
	Organization,
	OrganizationPurgeForceResult,
} from "@/lib/api/organizations";

export const ORG_LIFECYCLE_ERROR_MESSAGES: Record<string, string> = {
	ORG_ACTIVE_USERS_BLOCKED:
		"Cannot archive organization with active users. Deactivate users first.",
	ORG_NOT_ACTIVE: "Organization is archived and cannot accept this change.",
	ORG_RETENTION_NOT_MET:
		"Organization retention period is not met yet for purge-force.",
	ORG_NOT_ARCHIVED: "Organization must be archived before purge-force.",
	ORG_NOT_FOUND: "Organization not found.",
	ORG_STORAGE_CLEANUP_PENDING:
		"Organization data was purged from DB; storage cleanup is pending manual replay.",
	PURGE_CONFIRM_NAME_MISMATCH:
		"Organization name confirmation does not match exactly.",
	PURGE_CONFIRM_PHRASE_MISMATCH: "Purge confirmation phrase is incorrect.",
};

export function resolveOrganizationLifecycleErrorMessage(
	error: unknown,
): string | null {
	if (isForbiddenError(error)) {
		return null;
	}
	if (error instanceof APIClientError && error.code) {
		return ORG_LIFECYCLE_ERROR_MESSAGES[error.code] ?? error.message;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return "Request failed";
}

type ArchiveFn = (
	orgId: string,
	input?: { forceDeactivateUsers?: boolean },
) => Promise<Organization>;

export async function runOrganizationArchiveFlow(options: {
	archive: ArchiveFn;
	orgId: string;
	orgName: string;
	onArchived?: (organization: Organization) => void | Promise<void>;
}): Promise<void> {
	const { archive, orgId, orgName, onArchived } = options;

	const showArchiveToasts = (deactivatedUsersCount: number) => {
		toast.success(`Organization "${orgName}" archived`);
		if (deactivatedUsersCount > 0) {
			toast.success(
				`${deactivatedUsersCount} active user(s) deactivated during archive`,
			);
		}
	};

	const archived = await archive(orgId);
	await onArchived?.(archived);
	showArchiveToasts(archived.deactivatedUsersCount ?? 0);
}

export async function runOrganizationArchiveWithForceRetry(options: {
	error: unknown;
	archive: ArchiveFn;
	orgId: string;
	orgName: string;
	onArchived?: (organization: Organization) => void | Promise<void>;
}): Promise<boolean> {
	const { error, archive, orgId, orgName, onArchived } = options;
	if (
		!(
			error instanceof APIClientError &&
			error.code === "ORG_ACTIVE_USERS_BLOCKED"
		)
	) {
		return false;
	}

	const shouldForceArchive = window.confirm(
		"This organization has active users. Deactivate active users and archive now?",
	);
	if (!shouldForceArchive) {
		return true;
	}

	const archived = await archive(orgId, { forceDeactivateUsers: true });
	await onArchived?.(archived);
	toast.success(`Organization "${orgName}" archived`);
	toast.success(
		`${archived.deactivatedUsersCount ?? 0} active user(s) deactivated during archive`,
	);
	return true;
}

export function showOrganizationPurgeForceResultToast(
	orgName: string,
	result: OrganizationPurgeForceResult,
): void {
	if (result.status === "completed") {
		toast.success(`Organization "${orgName}" purged`);
		return;
	}

	toast.warning(
		result.manifestId
			? `Organization purged from DB. Storage cleanup pending (manifest: ${result.manifestId}).`
			: "Organization purged from DB. Storage cleanup pending.",
	);
}
