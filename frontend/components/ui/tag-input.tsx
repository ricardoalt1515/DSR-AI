"use client";

import { X } from "lucide-react";
import {
	type FocusEvent,
	type KeyboardEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
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

function normalizeTag(tag: string): string {
	return tag.trim();
}

function canAddTag(
	tags: string[],
	maxTags: number | undefined,
	tag: string,
): boolean {
	if (!tag) {
		return false;
	}

	if (tags.includes(tag)) {
		return false;
	}

	if (maxTags && tags.length >= maxTags) {
		return false;
	}

	return true;
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
	const wrapperRef = useRef<HTMLDivElement>(null);
	const suggestionsListId = useId();
	const [input, setInput] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
	const [liveMessage, setLiveMessage] = useState("");

	const filteredSuggestions = useMemo(
		() =>
			suggestions
				.filter(
					(s) =>
						s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s),
				)
				.slice(0, 10),
		[suggestions, input, tags],
	);

	useEffect(() => {
		if (!showSuggestions || filteredSuggestions.length === 0) {
			setActiveSuggestionIndex(-1);
			return;
		}

		setActiveSuggestionIndex((current) => {
			if (current < 0 || current >= filteredSuggestions.length) {
				return 0;
			}

			return current;
		});
	}, [filteredSuggestions.length, showSuggestions]);

	const activeSuggestion =
		activeSuggestionIndex >= 0
			? filteredSuggestions[activeSuggestionIndex]
			: undefined;

	const activeSuggestionId = activeSuggestion
		? `${suggestionsListId}-option-${activeSuggestionIndex}`
		: undefined;

	const addTag = (tag: string) => {
		const trimmed = normalizeTag(tag);
		if (!trimmed) {
			setLiveMessage("Tag is empty. Add text before pressing Enter.");
			return;
		}

		if (!canAddTag(tags, maxTags, trimmed)) {
			if (tags.includes(trimmed)) {
				setInput("");
				setLiveMessage(`Tag ${trimmed} is already added.`);
				return;
			}

			if (maxTags && tags.length >= maxTags) {
				setLiveMessage(`Maximum of ${maxTags} tags reached.`);
				return;
			}

			setInput("");
			setLiveMessage("Tag cannot be added.");
			return;
		}

		onChange([...tags, trimmed]);
		setInput("");
		setActiveSuggestionIndex(-1);
		setLiveMessage(`Added tag ${trimmed}.`);
	};

	const removeTag = (tagToRemove: string) => {
		onChange(tags.filter((t) => t !== tagToRemove));
		setLiveMessage(`Removed tag ${tagToRemove}.`);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (filteredSuggestions.length === 0) {
				return;
			}

			if (!showSuggestions) {
				setShowSuggestions(true);
				setActiveSuggestionIndex(0);
				return;
			}

			setActiveSuggestionIndex((current) =>
				Math.min(current + 1, filteredSuggestions.length - 1),
			);
			return;
		}

		if (e.key === "ArrowUp") {
			e.preventDefault();
			if (!showSuggestions || filteredSuggestions.length === 0) {
				return;
			}

			setActiveSuggestionIndex((current) => Math.max(current - 1, 0));
			return;
		}

		if (e.key === "Enter") {
			e.preventDefault();
			if (showSuggestions && activeSuggestion) {
				addTag(activeSuggestion);
				setShowSuggestions(false);
				return;
			}

			addTag(input);
			return;
		}

		if (e.key === ",") {
			e.preventDefault();
			addTag(input);
		} else if (e.key === "Backspace" && !input && tags.length > 0) {
			const lastTag = tags[tags.length - 1];
			if (lastTag) removeTag(lastTag);
		} else if (e.key === "Escape") {
			setShowSuggestions(false);
			setActiveSuggestionIndex(-1);
		}
	};

	const handleInputBlur = (e: FocusEvent<HTMLInputElement>) => {
		if (wrapperRef.current?.contains(e.relatedTarget)) {
			return;
		}

		setShowSuggestions(false);
	};

	const handleInputChange = (value: string) => {
		setInput(value);
		setShowSuggestions(value.length > 0);
	};

	return (
		<div ref={wrapperRef} className="space-y-2">
			<div aria-live="polite" className="sr-only">
				{liveMessage}
			</div>

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
					onChange={(e) => handleInputChange(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
					onBlur={handleInputBlur}
					placeholder={tags.length === 0 ? placeholder : ""}
					className="border-0 shadow-none focus-visible:ring-0 flex-1 min-w-[120px] h-7 px-1"
					disabled={maxTags ? tags.length >= maxTags : false}
					role="combobox"
					aria-autocomplete="list"
					aria-expanded={showSuggestions && filteredSuggestions.length > 0}
					aria-controls={suggestionsListId}
					aria-activedescendant={activeSuggestionId}
				/>
			</div>

			{/* Suggestions Dropdown */}
			{showSuggestions && filteredSuggestions.length > 0 && (
				<div
					id={suggestionsListId}
					role="listbox"
					aria-label="Tag suggestions"
					className="border rounded-md p-3 bg-popover text-popover-foreground shadow-md"
				>
					<p className="text-xs text-muted-foreground mb-2 font-medium">
						Common suggestions:
					</p>
					<div className="flex flex-wrap gap-1.5">
						{filteredSuggestions.map((suggestion, index) => (
							<button
								key={suggestion}
								type="button"
								role="option"
								id={`${suggestionsListId}-option-${index}`}
								aria-selected={index === activeSuggestionIndex}
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => addTag(suggestion)}
								onMouseEnter={() => setActiveSuggestionIndex(index)}
								className={cn(
									"rounded-md border px-2 py-1 text-xs transition-colors",
									"hover:bg-accent hover:text-accent-foreground",
									index === activeSuggestionIndex &&
										"bg-accent text-accent-foreground",
								)}
							>
								<Badge variant="outline" className="pointer-events-none">
									{suggestion}
								</Badge>
							</button>
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
