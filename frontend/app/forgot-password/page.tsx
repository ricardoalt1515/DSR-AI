"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthFormField, AuthLayout } from "@/components/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";

// Validation schema
const forgotPasswordSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ForgotPasswordData>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: { email: "" },
	});

	const onSubmit = async (data: ForgotPasswordData) => {
		setIsLoading(true);

		try {
			// FastAPI Users expects POST /auth/forgot-password with { email }
			await apiClient.post("/auth/forgot-password", { email: data.email });
			setIsSuccess(true);
		} catch (_error) {
			// Always show success to prevent email enumeration attacks
			setIsSuccess(true);
		} finally {
			setIsLoading(false);
		}
	};

	// Success state
	if (isSuccess) {
		return (
			<AuthLayout
				title="Check your email"
				subtitle="We've sent you a password reset link"
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
				<div className="text-center space-y-4">
					<div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
						<CheckCircle2 className="h-8 w-8 text-success" />
					</div>
					<p className="text-muted-foreground">
						If an account exists with that email, you&apos;ll receive a password
						reset link shortly.
					</p>
					<p className="text-sm text-muted-foreground">
						Didn&apos;t receive an email? Check your spam folder or try again.
					</p>
				</div>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout
			title="Forgot password?"
			subtitle="Enter your email and we'll send you a reset link"
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
				<AuthFormField
					label="Email"
					htmlFor="email"
					error={errors.email}
					required
				>
					<div className="relative">
						<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							id="email"
							type="email"
							placeholder="you@company.com"
							className="h-11 pl-10"
							disabled={isLoading}
							{...register("email")}
						/>
					</div>
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
								Sending...
							</>
						) : (
							"Send reset link"
						)}
					</Button>
				</motion.div>
			</form>
		</AuthLayout>
	);
}
