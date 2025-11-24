"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthFormField, AuthLayout, PasswordInput } from "@/components/features/auth";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";

// Password requirements matching registration
const resetPasswordSchema = z
	.object({
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
			.regex(/[a-z]/, "Password must contain at least one lowercase letter")
			.regex(/[0-9]/, "Password must contain at least one number"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

// Separate component to use useSearchParams (requires Suspense)
function ResetPasswordForm() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const token = searchParams.get("token");

	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<ResetPasswordData>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: { password: "", confirmPassword: "" },
	});

	const onSubmit = async (data: ResetPasswordData) => {
		if (!token) {
			setError("Invalid or missing reset token");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			// FastAPI Users expects POST /auth/reset-password with { token, password }
			await apiClient.post("/auth/reset-password", {
				token,
				password: data.password,
			});
			setIsSuccess(true);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to reset password";
			// Handle specific FastAPI Users errors
			if (message.includes("RESET_PASSWORD_BAD_TOKEN")) {
				setError("This reset link has expired or is invalid. Please request a new one.");
			} else {
				setError(message);
			}
		} finally {
			setIsLoading(false);
		}
	};

	// No token provided
	if (!token) {
		return (
			<AuthLayout
				title="Invalid link"
				subtitle="This password reset link is invalid"
				footer={
					<Link
						href="/forgot-password"
						className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
					>
						Request a new reset link
					</Link>
				}
			>
				<div className="text-center space-y-4">
					<div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
						<AlertCircle className="h-8 w-8 text-destructive" />
					</div>
					<p className="text-muted-foreground">
						The password reset link you clicked is invalid or has expired.
					</p>
				</div>
			</AuthLayout>
		);
	}

	// Success state
	if (isSuccess) {
		return (
			<AuthLayout
				title="Password reset!"
				subtitle="Your password has been changed successfully"
				footer={null}
			>
				<div className="text-center space-y-4">
					<div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
						<CheckCircle2 className="h-8 w-8 text-success" />
					</div>
					<p className="text-muted-foreground">
						You can now sign in with your new password.
					</p>
					<Button
						className="w-full h-11"
						onClick={() => router.push("/login")}
					>
						Go to sign in
					</Button>
				</div>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout
			title="Reset password"
			subtitle="Enter your new password below"
			footer={
				<Link
					href="/login"
					className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to sign in
				</Link>
			}
		>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				{error && (
					<div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
						{error}
					</div>
				)}

				<AuthFormField
					label="New Password"
					htmlFor="password"
					error={errors.password}
					required
				>
					<PasswordInput
						id="password"
						placeholder="Enter new password"
						className="h-11"
						disabled={isLoading}
						showStrengthMeter
						{...register("password")}
						value={watch("password")}
					/>
				</AuthFormField>

				<AuthFormField
					label="Confirm Password"
					htmlFor="confirmPassword"
					error={errors.confirmPassword}
					required
				>
					<PasswordInput
						id="confirmPassword"
						placeholder="Confirm new password"
						className="h-11"
						disabled={isLoading}
						{...register("confirmPassword")}
					/>
				</AuthFormField>

				<motion.div
					whileHover={{ scale: isLoading ? 1 : 1.01 }}
					whileTap={{ scale: isLoading ? 1 : 0.99 }}
				>
					<Button
						type="submit"
						className="w-full h-11 text-base font-medium"
						disabled={isLoading}
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Resetting...
							</>
						) : (
							"Reset password"
						)}
					</Button>
				</motion.div>
			</form>
		</AuthLayout>
	);
}

// Main page with Suspense boundary (required for useSearchParams)
export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<AuthLayout title="Loading..." subtitle="">
					<div className="flex justify-center py-8">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				</AuthLayout>
			}
		>
			<ResetPasswordForm />
		</Suspense>
	);
}
