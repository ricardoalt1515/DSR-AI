import { AlertTriangle, Package } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ImportSummary {
	/** Number of streams (accepted/amended) that will be created */
	importableStreams: number;
	/** Number of distinct location groups being imported */
	groupCount: number;
	/** Number of rejected/invalid items that won't be imported */
	skippedItems: number;
	/** Number of orphan items that have no location and won't be included */
	orphanCount: number;
}

interface ConfirmImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	summary: ImportSummary;
	loading?: boolean;
}

export function ConfirmImportDialog({
	open,
	onOpenChange,
	onConfirm,
	summary,
	loading = false,
}: ConfirmImportDialogProps) {
	const handleConfirm = async () => {
		await onConfirm();
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
							<Package className="h-5 w-5 text-emerald-400" />
						</div>
						<AlertDialogTitle>
							Import {summary.importableStreams} waste stream
							{summary.importableStreams === 1 ? "" : "s"}?
						</AlertDialogTitle>
					</div>
					<AlertDialogDescription asChild>
						<div className="mt-4 space-y-3">
							<p>
								This will create{" "}
								<span className="font-semibold text-foreground">
									{summary.importableStreams} stream
									{summary.importableStreams === 1 ? "" : "s"}
								</span>{" "}
								across{" "}
								<span className="font-semibold text-foreground">
									{summary.groupCount} location
									{summary.groupCount === 1 ? "" : "s"}
								</span>
								.
								{summary.skippedItems > 0 && (
									<>
										{" "}
										{summary.skippedItems} skipped item
										{summary.skippedItems === 1 ? "" : "s"} won&apos;t be
										imported.
									</>
								)}
							</p>
							{summary.orphanCount > 0 && (
								<div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2.5">
									<AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
									<p className="text-sm text-amber-200/90">
										{summary.orphanCount} stream
										{summary.orphanCount === 1 ? "" : "s"} couldn&apos;t be
										mapped to a location and won&apos;t be included. You can
										assign them after import.
									</p>
								</div>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={loading}
						className="bg-emerald-600 text-white hover:bg-emerald-700"
					>
						{loading
							? "Importing…"
							: `Import ${summary.importableStreams} stream${summary.importableStreams === 1 ? "" : "s"}`}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
