"use client";

import { FileUploader } from "@/components/shared/common/file-uploader";

interface FilesTabEnhancedProps {
	projectId: string;
	onDataImported?: () => void;
}

export function FilesTabEnhanced({
	projectId,
	onDataImported,
}: FilesTabEnhancedProps) {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold text-gradient">File managment</h2>
				<p className="text-muted-foreground">
					Upload laboratory analyses, technical reports or documents to
					automatically extract data with AI.
				</p>
			</div>

			<FileUploader projectId={projectId} onUploadComplete={onDataImported} />
		</div>
	);
}
