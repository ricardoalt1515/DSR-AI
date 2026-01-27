"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useFlyingValueStore } from "@/lib/stores/flying-value-store";

interface FlyingValueTargetProps {
	fieldId: string;
	sectionId: string;
	onValueLanded?: () => void;
}

export function FlyingValueTarget({
	fieldId,
	sectionId,
	onValueLanded,
}: FlyingValueTargetProps) {
	const { activeId, targetFieldId, targetSectionId, value, completeFlight } =
		useFlyingValueStore();

	const isReceiving =
		targetFieldId === fieldId &&
		targetSectionId === sectionId &&
		activeId !== null;

	const handleAnimationComplete = () => {
		onValueLanded?.();
		completeFlight();
	};

	return (
		<AnimatePresence>
			{isReceiving && value && (
				<motion.div
					layoutId={`flying-value-${activeId}`}
					className="absolute inset-0 flex items-center bg-primary/10 rounded border border-primary/30 px-2 z-10"
					onLayoutAnimationComplete={handleAnimationComplete}
					initial={{ scale: 1 }}
					animate={{ scale: [1, 1.03, 1] }}
					exit={{ opacity: 0, scale: 0.95 }}
					transition={{
						layout: {
							duration: 0.4,
							ease: [0.32, 0.72, 0, 1],
						},
						scale: { delay: 0.35, duration: 0.2 },
					}}
				>
					<span className="text-sm font-semibold text-primary truncate">
						{value}
					</span>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
