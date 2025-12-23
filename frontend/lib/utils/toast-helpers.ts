import { toast } from "sonner";

type UndoableToastOptions = {
	title: string;
	description?: string;
	undoAction: () => Promise<void>;
	undoLabel?: string;
	duration?: number;
};

/**
 * Shows a toast with an undo action button.
 * Use for destructive operations that can be reversed (soft-delete, etc.)
 *
 * @example
 * toastWithUndo({
 *   title: "File deleted",
 *   description: "document.pdf was removed",
 *   undoAction: async () => { await restoreFile(fileId) },
 * })
 */
export function toastWithUndo({
	title,
	description,
	undoAction,
	undoLabel = "Undo",
	duration = 8000,
}: UndoableToastOptions) {
	toast(title, {
		description,
		duration,
		action: {
			label: undoLabel,
			onClick: async () => {
				try {
					await undoAction();
					toast.success("Action undone");
				} catch {
					toast.error("Could not undo action");
				}
			},
		},
	});
}

type ProgressToastOptions = {
	title: string;
	description?: string;
};

/**
 * Shows a loading toast that can be updated or dismissed.
 * Returns functions to update, succeed, or fail the toast.
 *
 * @example
 * const progress = toastWithProgress({ title: "Uploading..." })
 * progress.update("Processing...", "50% complete")
 * progress.success("Upload complete!")
 */
export function toastWithProgress({ title, description }: ProgressToastOptions) {
	const toastId = toast.loading(title, { description });

	return {
		update: (newTitle: string, newDescription?: string) => {
			toast.loading(newTitle, { id: toastId, description: newDescription });
		},
		success: (message: string, newDescription?: string) => {
			toast.success(message, { id: toastId, description: newDescription });
		},
		error: (message: string, newDescription?: string) => {
			toast.error(message, { id: toastId, description: newDescription });
		},
		dismiss: () => {
			toast.dismiss(toastId);
		},
	};
}

type ToastPromiseMessages = {
	loading: string;
	success: string;
	error: string;
};

/**
 * Promise-based toast that shows loading, success, or error automatically.
 *
 * @example
 * await toastPromise(uploadFile(), {
 *   loading: "Uploading...",
 *   success: "File uploaded!",
 *   error: "Upload failed"
 * })
 */
export async function toastPromise<T>(
	promise: Promise<T>,
	messages: ToastPromiseMessages,
): Promise<T> {
	toast.promise(promise, messages);
	return promise;
}
