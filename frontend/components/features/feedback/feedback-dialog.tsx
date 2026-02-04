"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	FEEDBACK_TYPE_CONFIG,
	type FeedbackPayload,
	type FeedbackType,
	feedbackAPI,
} from "@/lib/api/feedback";
import { cn } from "@/lib/utils";

const FEEDBACK_TYPE_OPTIONS = Object.entries(FEEDBACK_TYPE_CONFIG).map(
	([value, info]) => ({
		value: value as FeedbackType,
		label: info.label,
	}),
);

/** Character count thresholds for visual feedback */
function getCharCountClass(length: number, max: number): string {
	const percent = (length / max) * 100;
	if (percent >= 95) return "text-destructive font-medium";
	if (percent >= 80) return "text-amber-600";
	return "text-muted-foreground";
}

interface FeedbackDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
	const [content, setContent] = useState("");
	const [feedbackType, setFeedbackType] = useState<FeedbackType | undefined>();
	const [loading, setLoading] = useState(false);
	const [contentError, setContentError] = useState<string | null>(null);
	const feedbackTypeValue = feedbackType ?? "none";
	const contentErrorId = "feedback-content-error";
	const contentHelpId = "feedback-content-help";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!content.trim()) {
			setContentError("Feedback is required.");
			return;
		}

		setLoading(true);
		try {
			const payload: FeedbackPayload = {
				content: content.trim(),
				pagePath: window.location.pathname,
				...(feedbackType && { feedbackType }),
			};
			await feedbackAPI.submit(payload);
			toast.success("Thanks for your feedback!");
			resetForm();
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to send feedback",
			);
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setContent("");
		setFeedbackType(undefined);
		setContentError(null);
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) resetForm();
		onOpenChange(open);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Send Feedback</DialogTitle>
						<DialogDescription>
							Help us improve by sharing your thoughts.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="feedback-type">Type (optional)</Label>
							<Select
								value={feedbackTypeValue}
								onValueChange={(value) =>
									setFeedbackType(
										value === "none" ? undefined : (value as FeedbackType),
									)
								}
							>
								<SelectTrigger id="feedback-type">
									<SelectValue placeholder="Select type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No type</SelectItem>
									{FEEDBACK_TYPE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="feedback-content">
								Your feedback <span className="text-destructive">*</span>
							</Label>
							<Textarea
								id="feedback-content"
								value={content}
								onChange={(e) => {
									setContent(e.target.value);
									if (contentError) setContentError(null);
								}}
								placeholder="Describe your feedback..."
								rows={4}
								maxLength={4000}
								className="resize-none"
								required
								aria-required="true"
								aria-invalid={!!contentError}
								aria-describedby={cn(
									contentError ? contentErrorId : undefined,
									contentHelpId,
								)}
							/>
							{contentError && (
								<p
									id={contentErrorId}
									className="text-xs text-destructive"
									role="alert"
								>
									{contentError}
								</p>
							)}
							<p
								id={contentHelpId}
								className={cn(
									"text-xs text-right",
									getCharCountClass(content.length, 4000),
								)}
								aria-live="polite"
							>
								{content.length}/4000
							</p>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<LoadingButton
							type="submit"
							loading={loading}
							disabled={!content.trim()}
						>
							Send Feedback
						</LoadingButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
