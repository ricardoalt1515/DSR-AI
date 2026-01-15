"use client";

import { cn } from "@/lib/utils";

interface OrgAvatarProps {
	name: string;
	slug?: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const COLORS = [
	"bg-blue-500",
	"bg-emerald-500",
	"bg-violet-500",
	"bg-amber-500",
	"bg-rose-500",
	"bg-cyan-500",
	"bg-indigo-500",
	"bg-teal-500",
];

function getColorFromString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	const index = Math.abs(hash) % COLORS.length;
	return COLORS[index] ?? "bg-blue-500";
}

function getInitials(name: string): string {
	const words = name.trim().split(/\s+/);
	const firstWord = words[0] ?? "";
	const secondWord = words[1] ?? "";
	if (words.length === 1) {
		return firstWord.substring(0, 2).toUpperCase();
	}
	return ((firstWord[0] ?? "") + (secondWord[0] ?? "")).toUpperCase();
}

const sizeClasses = {
	sm: "h-8 w-8 text-xs",
	md: "h-10 w-10 text-sm",
	lg: "h-14 w-14 text-lg",
};

export function OrgAvatar({
	name,
	slug,
	size = "md",
	className,
}: OrgAvatarProps) {
	const colorClass = getColorFromString(slug || name);
	const initials = getInitials(name);

	return (
		<div
			className={cn(
				"flex items-center justify-center rounded-lg font-semibold text-white",
				colorClass,
				sizeClasses[size],
				className,
			)}
		>
			{initials}
		</div>
	);
}
