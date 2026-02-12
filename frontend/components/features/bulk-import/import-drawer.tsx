"use client";

/**
 * Import Drawer — Sheet panel for upload + AI processing.
 * Opens from Company page, closes when items are ready for review.
 *
 * Supports an optional `initialFile` prop for global drag & drop:
 * when set, the drawer opens with the file pre-loaded, skipping
 * the drop zone and showing the file preview immediately.
 */

import { CheckCircle2, FileUp, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileDropZone } from "./file-drop-zone";
import { ProcessingAnimation } from "./processing-animation";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import type { BulkImportRun, EntrypointType } from "@/lib/api/bulk-import";
import { bulkImportAPI } from "@/lib/api/bulk-import";

type DrawerStep = "upload" | "processing" | "done" | "error";

interface ImportDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    companyId: string;
    entrypointType: EntrypointType;
    /** Called when items are ready — passes the run so the parent can show inline review */
    onReviewReady: (run: BulkImportRun) => void;
    /** Optional file to pre-load (from global drag & drop) */
    initialFile?: File | null;
}

export function ImportDrawer({
    open,
    onOpenChange,
    companyId,
    entrypointType,
    onReviewReady,
    initialFile,
}: ImportDrawerProps) {
    const [step, setStep] = useState<DrawerStep>("upload");
    const [runId, setRunId] = useState<string | null>(null);
    const [completedRun, setCompletedRun] = useState<BulkImportRun | null>(null);
    const [uploading, setUploading] = useState(false);

    const reset = useCallback(() => {
        setStep("upload");
        setRunId(null);
        setCompletedRun(null);
        setUploading(false);
    }, []);

    const handleFileSelected = useCallback(
        async (file: File) => {
            setUploading(true);
            try {
                const result = await bulkImportAPI.upload(file, entrypointType, companyId);
                setRunId(result.runId);
                setStep("processing");
                toast.success("File uploaded", { description: "AI is processing your file..." });
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Upload failed");
            } finally {
                setUploading(false);
            }
        },
        [entrypointType, companyId],
    );

    // (#1) Auto-upload when initialFile is provided
    useEffect(() => {
        if (initialFile && open && step === "upload" && !uploading) {
            void handleFileSelected(initialFile);
        }
    }, [initialFile, open, step, uploading, handleFileSelected]);

    const handleProcessingComplete = useCallback((run: BulkImportRun) => {
        setCompletedRun(run);
        setStep("done");
    }, []);

    const handleReviewItems = useCallback(() => {
        if (completedRun) {
            onReviewReady(completedRun);
            onOpenChange(false);
            reset();
        }
    }, [completedRun, onReviewReady, onOpenChange, reset]);

    const handleClose = useCallback(
        (isOpen: boolean) => {
            // Prevent closing during processing
            if (!isOpen && step === "processing") {
                toast.info("Processing in progress", {
                    description: "Please wait for the AI to finish.",
                });
                return;
            }
            if (!isOpen) reset();
            onOpenChange(isOpen);
        },
        [step, onOpenChange, reset],
    );

    const itemCount = completedRun
        ? completedRun.totalItems
        : 0;

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                        <FileUp className="h-5 w-5" />
                        Import from Document
                    </SheetTitle>
                    <SheetDescription>
                        {step === "upload" && "Upload a file and our AI will extract locations and waste streams."}
                        {step === "processing" && "AI is analyzing your document..."}
                        {step === "done" && "Your data is ready for review!"}
                        {step === "error" && "Something went wrong."}
                    </SheetDescription>
                </SheetHeader>

                {/* Upload step */}
                {step === "upload" && (
                    <FileDropZone onFileSelected={handleFileSelected} uploading={uploading} />
                )}

                {/* Processing step */}
                {step === "processing" && runId && (
                    <ProcessingAnimation
                        runId={runId}
                        onComplete={handleProcessingComplete}
                        onNoData={() => {
                            setStep("upload");
                            toast.info("No data found in your file. Try another one.");
                        }}
                        onFailed={(error) => {
                            setStep("error");
                            toast.error("Processing failed", { description: error });
                        }}
                        onUploadAnother={reset}
                    />
                )}

                {/* Done step — show summary and review button */}
                {step === "done" && completedRun && (
                    <div className="flex flex-col items-center gap-5 py-6">
                        <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-bold">Data Extracted!</h3>
                            <p className="text-muted-foreground">
                                Found <strong>{itemCount}</strong> {itemCount === 1 ? "item" : "items"}{" "}
                                from <strong>{completedRun.sourceFilename}</strong>
                            </p>
                        </div>
                        <Button size="lg" onClick={handleReviewItems} className="w-full">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Review Items
                        </Button>
                    </div>
                )}

                {/* Error recovery */}
                {step === "error" && (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <Button variant="outline" onClick={reset}>
                            Try Again
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
