/**
 * PremiumTestimonial Component
 *
 * Testimonial card with glassmorphic design.
 * Features:
 * - Avatar with fallback
 * - Star rating display
 * - Role and company information
 * - Glassmorphic background
 */

"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface TestimonialProps {
	/** Testimonial quote */
	quote: string;
	/** Person's name */
	name: string;
	/** Person's role */
	role: string;
	/** Company name (optional) */
	company?: string;
	/** Avatar image URL (optional) */
	avatarUrl?: string;
	/** Star rating (1-5) */
	rating?: number;
	/** Additional CSS classes */
	className?: string;
}

export function PremiumTestimonial({
	quote,
	name,
	role,
	company,
	avatarUrl,
	rating = 5,
	className,
}: TestimonialProps) {
	// Generate initials from name
	const initials = name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 1, duration: 0.5 }}
			className={cn(
				"relative bg-white/10 backdrop-blur-md border border-white/20",
				"rounded-xl p-6 shadow-2xl",
				className,
			)}
		>
			{/* Decorative quote icon */}
			<Quote className="absolute top-4 right-4 h-8 w-8 text-white/20" />

			<div className="flex items-start gap-4">
				{/* Avatar */}
				<Avatar className="h-14 w-14 border-2 border-white/30 flex-shrink-0">
					<AvatarImage src={avatarUrl} alt={name} />
					<AvatarFallback className="bg-white/20 backdrop-blur-sm text-white font-semibold">
						{initials}
					</AvatarFallback>
				</Avatar>

				{/* Content */}
				<div className="flex-1 min-w-0">
					{/* Quote */}
					<blockquote className="text-white/90 text-base leading-relaxed mb-4 italic">
						&quot;{quote}&quot;
					</blockquote>

					{/* Author info */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-sm font-semibold text-white">{name}</span>
							{(role || company) && (
								<>
									<Separator
										orientation="vertical"
										className="h-4 bg-white/30"
									/>
									<span className="text-sm text-white/70">
										{[role, company].filter(Boolean).join(", ")}
									</span>
								</>
							)}
						</div>

						{/* Star rating */}
						{rating > 0 && (
							<fieldset
								className="flex gap-1 border-0 p-0 m-0"
								aria-label={`Rating: ${rating} out of 5 stars`}
							>
								{Array.from({ length: 5 }, (_, i) => ({
									id: `star-${i}`,
									index: i,
								})).map(({ id, index }) => (
									<Star
										key={id}
										className={cn(
											"h-4 w-4",
											index < rating
												? "fill-warning text-warning"
												: "text-white/30",
										)}
									/>
								))}
							</fieldset>
						)}
					</div>
				</div>
			</div>
		</motion.div>
	);
}
