"use client";

import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { VoiceInterviewTranscriptSegment } from "@/lib/api/voice-interviews";
import { cn } from "@/lib/utils";

interface TranscriptPanelProps {
	segments: VoiceInterviewTranscriptSegment[];
	transcriptText: string;
	audioUrl: string | null;
	/** Externally-requested seek (from evidence play buttons) */
	seekToSec?: number | null;
	onSeekHandled?: () => void;
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TranscriptPanel({
	segments,
	transcriptText,
	audioUrl,
	seekToSec,
	onSeekHandled,
}: TranscriptPanelProps) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const activeSegmentRef = useRef<HTMLButtonElement | null>(null);

	/* ── Audio event handlers ── */
	const onTimeUpdate = useCallback(() => {
		if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
	}, []);

	const onLoadedMetadata = useCallback(() => {
		if (audioRef.current) setDuration(audioRef.current.duration);
	}, []);

	const onPlayPause = useCallback(() => {
		if (audioRef.current) setPlaying(!audioRef.current.paused);
	}, []);

	/* ── External seek (from evidence buttons) ── */
	useEffect(() => {
		if (seekToSec != null && audioRef.current) {
			audioRef.current.currentTime = Math.max(0, seekToSec);
			void audioRef.current.play();
			onSeekHandled?.();
		}
	}, [seekToSec, onSeekHandled]);

	/* ── Active segment ── */
	const activeIndex = useMemo(() => {
		if (segments.length === 0) return -1;
		for (let i = segments.length - 1; i >= 0; i--) {
			const seg = segments[i];
			if (seg && currentTime >= seg.startSec) return i;
		}
		return 0;
	}, [segments, currentTime]);

	/* ── Auto-scroll to active segment ── */
	useEffect(() => {
		if (activeIndex >= 0 && playing && activeSegmentRef.current) {
			activeSegmentRef.current.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
		}
	}, [activeIndex, playing]);

	const togglePlay = useCallback(() => {
		if (!audioRef.current) return;
		if (audioRef.current.paused) {
			void audioRef.current.play();
		} else {
			audioRef.current.pause();
		}
	}, []);

	const seekTo = useCallback((seconds: number) => {
		if (!audioRef.current) return;
		audioRef.current.currentTime = Math.max(0, seconds);
		void audioRef.current.play();
	}, []);

	const handleSeekBar = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!audioRef.current || duration === 0) return;
			const rect = e.currentTarget.getBoundingClientRect();
			const ratio = Math.max(
				0,
				Math.min(1, (e.clientX - rect.left) / rect.width),
			);
			audioRef.current.currentTime = ratio * duration;
		},
		[duration],
	);

	const hasSegments = segments.length > 0;
	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

	return (
		<div className="flex flex-col h-full">
			{/* Transcript body */}
			<ScrollArea className="flex-1 min-h-0">
				<div className="space-y-0.5 p-4">
					{hasSegments ? (
						segments.map((seg, i) => (
							<button
								key={`${seg.startSec}-${i}`}
								type="button"
								ref={i === activeIndex ? activeSegmentRef : null}
								onClick={() => seekTo(seg.startSec)}
								className={cn(
									"flex w-full gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors duration-150 text-left",
									i === activeIndex ? "bg-emerald-500/10" : "hover:bg-muted/50",
								)}
							>
								<span className="text-[11px] font-mono text-muted-foreground/60 pt-0.5 shrink-0 w-10 text-right">
									{formatTime(seg.startSec)}
								</span>
								<p
									className={cn(
										"text-sm leading-relaxed",
										i === activeIndex
											? "text-foreground"
											: "text-muted-foreground",
									)}
								>
									{seg.speakerLabel && (
										<span className="font-medium text-emerald-400/70 mr-1">
											{seg.speakerLabel}:
										</span>
									)}
									{seg.text}
								</p>
							</button>
						))
					) : (
						<p className="text-sm text-muted-foreground whitespace-pre-wrap px-2">
							{transcriptText || "Transcript unavailable"}
						</p>
					)}
				</div>
			</ScrollArea>

			{/* ── Sticky Audio Player ── */}
			{audioUrl && (
				<div className="border-t border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3">
					{/* biome-ignore lint/a11y/useMediaCaption: transcript shown above */}
					<audio
						ref={audioRef}
						src={audioUrl}
						onTimeUpdate={onTimeUpdate}
						onLoadedMetadata={onLoadedMetadata}
						onPlay={onPlayPause}
						onPause={onPlayPause}
						preload="metadata"
					/>

					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 shrink-0"
							onClick={togglePlay}
						>
							{playing ? (
								<Pause className="h-4 w-4" />
							) : (
								<Play className="h-4 w-4 ml-0.5" />
							)}
						</Button>

						{/* Seek bar */}
						<div
							className="flex-1 h-1.5 rounded-full bg-muted/50 cursor-pointer relative group"
							onClick={handleSeekBar}
							onKeyDown={() => {}}
							role="slider"
							aria-valuenow={currentTime}
							aria-valuemax={duration}
							tabIndex={0}
						>
							<div
								className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/60 group-hover:bg-emerald-500/80 transition-colors"
								style={{ width: `${progress}%` }}
							/>
							<div
								className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
								style={{ left: `calc(${progress}% - 6px)` }}
							/>
						</div>

						{/* Time */}
						<span className="text-[11px] font-mono text-muted-foreground shrink-0 w-[72px] text-right">
							{formatTime(currentTime)} / {formatTime(duration)}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
