"use client";

import { X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagInputProps {
	tags: string[];
	onChange: (tags: string[]) => void;
	placeholder?: string;
	suggestions?: string[];
	className?: string;
	maxTags?: number;
}

/**
 * TagInput Component
 * A reusable component for adding/removing tags with suggestions
 * Used for units, options, and any multi-value string input
 */
export function TagInput({
	tags,
	onChange,
	placeholder = "Type and press Enter",
	suggestions = [],
	className,
	maxTags,
}: TagInputProps) {
	const [input, setInput] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);

	const filteredSuggestions = suggestions
		.filter(
			(s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s),
		)
		.slice(0, 10); // Limit suggestions to 10

	const addTag = (tag: string) => {
		const trimmed = tag.trim();
		if (!trimmed) return;
		if (tags.includes(trimmed)) {
			setInput("");
			return;
		}
		if (maxTags && tags.length >= maxTags) {
			return;
		}

		onChange([...tags, trimmed]);
		setInput("");
	};

	const removeTag = (tagToRemove: string) => {
		onChange(tags.filter((t) => t !== tagToRemove));
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			addTag(input);
		} else if (e.key === "Backspace" && !input && tags.length > 0) {
			const lastTag = tags[tags.length - 1];
			if (lastTag) removeTag(lastTag);
		} else if (e.key === "Escape") {
			setShowSuggestions(false);
		}
	};

	return (
		<div className="space-y-2">
			{/* Tags Input Area */}
			<div
				className={cn(
					"flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] bg-background",
					"focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
					className,
				)}
			>
				{tags.map((tag) => (
					<Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
						<span className="text-sm">{tag}</span>
						<button
							type="button"
							onClick={() => removeTag(tag)}
							className="ml-1 hover:bg-muted rounded-sm p-0.5 transition-colors"
							aria-label={`Remove ${tag}`}
						>
							<X className="h-3 w-3" />
						</button>
					</Badge>
				))}
				<Input
					value={input}
					onChange={(e) => {
						setInput(e.target.value);
						setShowSuggestions(e.target.value.length > 0);
					}}
					onKeyDown={handleKeyDown}
					onFocus={() =>
						setShowSuggestions(input.length > 0 || suggestions.length > 0)
					}
					onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
					placeholder={tags.length === 0 ? placeholder : ""}
					className="border-0 shadow-none focus-visible:ring-0 flex-1 min-w-[120px] h-7 px-1"
					disabled={maxTags ? tags.length >= maxTags : false}
				/>
			</div>

			{/* Suggestions Dropdown */}
			{showSuggestions && filteredSuggestions.length > 0 && (
				<div className="border rounded-md p-3 bg-popover text-popover-foreground shadow-md">
					<p className="text-xs text-muted-foreground mb-2 font-medium">
						Common suggestions:
					</p>
					<div className="flex flex-wrap gap-1.5">
						{filteredSuggestions.map((suggestion) => (
							<Badge
								key={suggestion}
								variant="outline"
								className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
								onClick={() => addTag(suggestion)}
							>
								{suggestion}
							</Badge>
						))}
					</div>
				</div>
			)}

			{/* Helper text */}
			{maxTags && (
				<p className="text-xs text-muted-foreground">
					{tags.length} / {maxTags} {tags.length === 1 ? "item" : "items"}
				</p>
			)}
		</div>
	);
}
