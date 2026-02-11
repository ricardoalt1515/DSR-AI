"use client";

/**
 * Upload step — drag & drop file zone with format validation.
 */

import {
    FileSpreadsheet,
    FileText,
    Upload,
    X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ACCEPTED_EXTENSIONS = [".xlsx", ".pdf"];
const ACCEPTED_MIME_TYPES = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadStepProps {
    onFileSelected: (file: File) => void;
    uploading: boolean;
}

export function UploadStep({ onFileSelected, uploading }: UploadStepProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const validateFile = useCallback((file: File): boolean => {
        const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
            toast.error("Unsupported file type", {
                description: `Please upload one of: ${ACCEPTED_EXTENSIONS.join(", ")}`,
            });
            return false;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error("File too large", {
                description: "Maximum file size is 10MB",
            });
            return false;
        }
        return true;
    }, []);

    const handleFile = useCallback(
        (file: File) => {
            if (validateFile(file)) {
                setSelectedFile(file);
            }
        },
        [validateFile],
    );

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile],
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile],
    );

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (name: string) => {
        const ext = name.split(".").pop()?.toLowerCase();
                        if (ext === "pdf") return FileText;
                        return FileSpreadsheet;
    };

    return (
        <div className="space-y-6">
            {/* Drop Zone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
					relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
					${dragActive
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                    }
					${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}
				`}
                onClick={() => {
                    if (!uploading) {
                        document.getElementById("bulk-import-file-input")?.click();
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        document.getElementById("bulk-import-file-input")?.click();
                    }
                }}
                role="button"
                tabIndex={0}
            >
                <input
                    id="bulk-import-file-input"
                    type="file"
                    accept={ACCEPTED_MIME_TYPES.join(",")}
                    onChange={handleInputChange}
                    className="hidden"
                />

                <div className="flex flex-col items-center gap-4">
                    <div className={`
						p-4 rounded-full transition-colors duration-200
						${dragActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
					`}>
                        <Upload className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold">
                            {dragActive ? "Drop your file here" : "Drag & drop your file"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            or <span className="text-primary underline">browse</span> to select
                        </p>
                    </div>
                </div>
            </div>

            {/* Accepted formats */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
                {["XLSX", "PDF"].map((format) => (
                    <span
                        key={format}
                        className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground"
                    >
                        .{format.toLowerCase()}
                    </span>
                ))}
                <span className="text-xs text-muted-foreground">• Max 10MB</span>
            </div>

            {/* Selected file preview */}
            {selectedFile && (
                <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            {(() => {
                                const Icon = getFileIcon(selectedFile.name);
                                return <Icon className="h-8 w-8 text-primary flex-shrink-0" />;
                            })()}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {selectedFile.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                            {!uploading && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFile(null);
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Upload button */}
            {selectedFile && (
                <div className="flex justify-center">
                    <Button
                        size="lg"
                        disabled={uploading}
                        onClick={() => onFileSelected(selectedFile)}
                        className="min-w-[200px]"
                    >
                        {uploading ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                Start Import
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
