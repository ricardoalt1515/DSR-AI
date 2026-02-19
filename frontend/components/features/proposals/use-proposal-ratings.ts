"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { proposalRatingsAPI } from "@/lib/api/proposal-ratings";
import { useLatestRequest } from "@/lib/hooks/use-latest-request";
import type {
	ProposalRating,
	ProposalRatingStats,
} from "@/lib/types/proposal-rating";

const RATING_CRITERIA_KEYS = [
	"coverageNeedsScore",
	"qualityInfoScore",
	"businessDataScore",
] as const;

type CriterionKey = (typeof RATING_CRITERIA_KEYS)[number];

type Scores = Record<CriterionKey, number>;

const EMPTY_SCORES: Scores = {
	coverageNeedsScore: 0,
	qualityInfoScore: 0,
	businessDataScore: 0,
};

interface ReadyState {
	status: "ready";
	currentRating: ProposalRating | null;
	ratingStats: ProposalRatingStats | null;
	scores: Scores;
	comment: string;
	commentChanged: boolean;
	isSaving: boolean;
	allScored: boolean;
	averageScore: number | null;
	setScore: (key: CriterionKey, value: number) => void;
	setComment: (value: string) => void;
	save: () => Promise<boolean>;
}

type RatingState =
	| { status: "loading" }
	| { status: "error"; retry: () => void }
	| ReadyState;

export type { ReadyState, RatingState, CriterionKey, Scores };

export function useProposalRatings(
	projectId: string,
	proposalId: string,
	isWriteBlocked: boolean,
): RatingState {
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [currentRating, setCurrentRating] = useState<ProposalRating | null>(
		null,
	);
	const [ratingStats, setRatingStats] = useState<ProposalRatingStats | null>(
		null,
	);
	const [scores, setScores] = useState<Scores>(EMPTY_SCORES);
	const [comment, setCommentRaw] = useState("");
	const [commentChanged, setCommentChanged] = useState(false);
	// Ref wrapper so loadRequest never enters useCallback/useEffect deps,
	// preventing the infinite loop caused by useLatestRequest returning a new
	// object identity each render (even though its callbacks are stable).
	const loadRequestRaw = useLatestRequest();
	const loadRequestRef = useRef(loadRequestRaw);
	loadRequestRef.current = loadRequestRaw;

	// Refs for stable `save` callback — reads fresh values without dep churn
	const scoresRef = useRef(scores);
	scoresRef.current = scores;
	const commentRef = useRef(comment);
	commentRef.current = comment;
	const commentChangedRef = useRef(commentChanged);
	commentChangedRef.current = commentChanged;
	const currentRatingRef = useRef(currentRating);
	currentRatingRef.current = currentRating;
	const isWriteBlockedRef = useRef(isWriteBlocked);
	isWriteBlockedRef.current = isWriteBlocked;

	const load = useCallback(async () => {
		const requestId = loadRequestRef.current.startRequest();
		setIsLoading(true);
		setHasError(false);
		try {
			const [ratingResponse, statsResponse] = await Promise.all([
				proposalRatingsAPI.get(projectId, proposalId),
				proposalRatingsAPI.getStats(projectId, proposalId),
			]);

			if (!loadRequestRef.current.isLatest(requestId)) return;

			setCurrentRating(ratingResponse.rating);
			setRatingStats(statsResponse);

			if (ratingResponse.rating) {
				setScores({
					coverageNeedsScore: ratingResponse.rating.coverageNeedsScore,
					qualityInfoScore: ratingResponse.rating.qualityInfoScore,
					businessDataScore: ratingResponse.rating.businessDataScore,
				});
				setCommentRaw(ratingResponse.rating.comment ?? "");
			} else {
				setScores(EMPTY_SCORES);
				setCommentRaw("");
			}
			setCommentChanged(false);
		} catch {
			if (!loadRequestRef.current.isLatest(requestId)) return;
			setHasError(true);
			toast.error("Failed to load proposal ratings");
		} finally {
			if (loadRequestRef.current.isLatest(requestId)) setIsLoading(false);
		}
	}, [projectId, proposalId]);

	useEffect(() => {
		void load();
		return () => {
			loadRequestRef.current.invalidate();
		};
	}, [load]);

	const setScore = useCallback((key: CriterionKey, value: number) => {
		setScores((prev) => ({ ...prev, [key]: value }));
	}, []);

	const setComment = useCallback((value: string) => {
		setCommentRaw(value);
		setCommentChanged(true);
	}, []);

	const save = useCallback(async (): Promise<boolean> => {
		if (isWriteBlockedRef.current) {
			toast.error("Archived proposals are read-only");
			return false;
		}

		const currentScores = scoresRef.current;
		const allScored = RATING_CRITERIA_KEYS.every(
			(key) => currentScores[key] >= 1,
		);

		if (!allScored) {
			toast.error("Please rate all 3 criteria");
			return false;
		}

		const currentComment = commentRef.current;
		if (currentComment !== "" && currentComment.trim().length === 0) {
			toast.error("Comment cannot be only whitespace");
			return false;
		}

		const wasUpdate = currentRatingRef.current !== null;

		setIsSaving(true);
		try {
			const payload: {
				coverageNeedsScore: number;
				qualityInfoScore: number;
				businessDataScore: number;
				comment?: string | null;
			} = { ...currentScores };

			if (commentChangedRef.current || currentRatingRef.current === null) {
				payload.comment = currentComment === "" ? "" : currentComment;
			}

			const response = await proposalRatingsAPI.upsert(
				projectId,
				proposalId,
				payload,
			);
			setCurrentRating(response.rating);
			if (response.rating) {
				setCommentRaw(response.rating.comment ?? "");
			}
			setCommentChanged(false);
			toast.success(wasUpdate ? "Rating updated" : "Rating saved");

			// getStats aggregates across ALL users — not returned by upsert.
			// Best-effort: a stats refresh failure must not retroactively fail the save.
			proposalRatingsAPI
				.getStats(projectId, proposalId)
				.then(setRatingStats)
				.catch(() => {
					toast.warning(
						"Rating saved. Stats refresh failed — reload to update.",
					);
				});

			return true;
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to save rating";
			toast.error(message);
			return false;
		} finally {
			setIsSaving(false);
		}
	}, [projectId, proposalId]);

	if (isLoading) {
		return { status: "loading" };
	}

	if (hasError) {
		return { status: "error", retry: load };
	}

	const allScored = RATING_CRITERIA_KEYS.every((key) => scores[key] >= 1);

	const averageScore = allScored
		? (scores.coverageNeedsScore +
				scores.qualityInfoScore +
				scores.businessDataScore) /
			3
		: null;

	return {
		status: "ready",
		currentRating,
		ratingStats,
		scores,
		comment,
		commentChanged,
		isSaving,
		allScored,
		averageScore,
		setScore,
		setComment,
		save,
	};
}
