"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowLeft,
	ArrowRight,
	Building2,
	CheckCircle2,
	Loader2,
	Mail,
	User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	AuthFormField,
	AuthLayout,
	PasswordInput,
} from "@/components/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/contexts";
import {
	type RegisterStep1Data,
	type RegisterStep2Data,
	registerStep1Schema,
	registerStep2Schema,
} from "@/lib/validation/auth-schemas";

export default function RegisterPage() {
	const [currentStep, setCurrentStep] = useState<1 | 2>(1);
	const [isLoading, setIsLoading] = useState(false);
	const [step1Data, setStep1Data] = useState<RegisterStep1Data | null>(null);
	const { register: registerUser } = useAuth();
	const router = useRouter();

	// Form for Step 1 (Email & Password)
	const step1Form = useForm<RegisterStep1Data>({
		resolver: zodResolver(registerStep1Schema),
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	// Form for Step 2 (Personal Info)
	const step2Form = useForm<RegisterStep2Data>({
		resolver: zodResolver(registerStep2Schema),
		defaultValues: {
			firstName: "",
			lastName: "",
			company: "",
		},
	});

	const progressPercentage = currentStep === 1 ? 50 : 100;

	// Handle Step 1 submission (go to next step)
	const onStep1Submit = (data: RegisterStep1Data) => {
		setStep1Data(data);
		setCurrentStep(2);
	};

	// Handle Step 2 submission (final registration)
	const onStep2Submit = async (data: RegisterStep2Data) => {
		if (!step1Data) {
			toast.error("Please complete step 1 first");
			setCurrentStep(1);
			return;
		}

		setIsLoading(true);

		try {
			// Combine data from both steps
			await registerUser(
				step1Data.email,
				step1Data.password,
				data.firstName,
				data.lastName,
				data.company || undefined,
			);
			// Success toast is handled by AuthContext
			router.push("/dashboard");
		} catch (_error) {
			// Error toast is handled by AuthContext
			// Logging handled by AuthContext
		} finally {
			setIsLoading(false);
		}
	};

	// Go back to previous step
	const goToPreviousStep = () => {
		if (currentStep === 2) {
			setCurrentStep(1);
		}
	};

	return (
		<AuthLayout
			title="Create your account"
			subtitle={`Step ${currentStep} of 2: ${currentStep === 1 ? "Account credentials" : "Personal information"}`}
			footer={
				<div className="text-center text-sm">
					<span className="text-muted-foreground">
						Already have an account?{" "}
					</span>
					<Link
						href="/login"
						className="font-medium text-primary hover:underline transition-colors"
					>
						Sign in
					</Link>
				</div>
			}
		>
			{/* Progress Indicator */}
			<div className="mb-6 space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="font-medium text-foreground">
						Step {currentStep} of 2
					</span>
					<span className="text-muted-foreground">
						{progressPercentage}% complete
					</span>
				</div>
				<Progress value={progressPercentage} className="h-2" />
			</div>

			{/* Step Indicators */}
			<div className="flex items-center justify-center gap-2 mb-8">
				<div
					className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
						currentStep === 1
							? "bg-primary text-primary-foreground"
							: "bg-success/10 text-success"
					}`}
				>
					{currentStep > 1 ? (
						<CheckCircle2 className="h-4 w-4" />
					) : (
						<Mail className="h-4 w-4" />
					)}
					<span>Credentials</span>
				</div>

				<div className="h-px w-8 bg-border" />

				<div
					className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
						currentStep === 2
							? "bg-primary text-primary-foreground"
							: "bg-muted text-muted-foreground"
					}`}
				>
					<User className="h-4 w-4" />
					<span>Profile</span>
				</div>
			</div>

			{/* Step Content with Animation */}
			<AnimatePresence mode="wait">
				{currentStep === 1 ? (
					<motion.form
						key="step1"
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -20 }}
						transition={{ duration: 0.3 }}
						onSubmit={step1Form.handleSubmit(onStep1Submit)}
						className="space-y-4"
					>
						{/* Email Field */}
						<AuthFormField
							label="Email"
							htmlFor="email"
							error={step1Form.formState.errors.email}
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
									{...step1Form.register("email")}
								/>
							</div>
						</AuthFormField>

						{/* Password Field with Strength Meter */}
						<AuthFormField
							label="Password"
							htmlFor="password"
							error={step1Form.formState.errors.password}
							required
						>
							<PasswordInput
								id="password"
								placeholder="Create a strong password"
								className="h-11"
								disabled={isLoading}
								showStrengthMeter
								{...step1Form.register("password")}
								value={step1Form.watch("password")}
							/>
						</AuthFormField>

						{/* Confirm Password Field */}
						<AuthFormField
							label="Confirm Password"
							htmlFor="confirmPassword"
							error={step1Form.formState.errors.confirmPassword}
							required
						>
							<PasswordInput
								id="confirmPassword"
								placeholder="Re-enter your password"
								className="h-11"
								disabled={isLoading}
								{...step1Form.register("confirmPassword")}
							/>
						</AuthFormField>

						{/* Next Button */}
						<motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
							<Button
								type="submit"
								className="w-full h-11 text-base font-medium"
								disabled={isLoading}
							>
								Continue to profile
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</motion.div>
					</motion.form>
				) : (
					<motion.form
						key="step2"
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -20 }}
						transition={{ duration: 0.3 }}
						onSubmit={step2Form.handleSubmit(onStep2Submit)}
						className="space-y-4"
					>
						{/* First Name & Last Name */}
						<div className="grid grid-cols-2 gap-4">
							<AuthFormField
								label="First Name"
								htmlFor="firstName"
								error={step2Form.formState.errors.firstName}
								required
							>
								<div className="relative">
									<User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										id="firstName"
										type="text"
										placeholder="John"
										className="h-11 pl-10"
										disabled={isLoading}
										{...step2Form.register("firstName")}
									/>
								</div>
							</AuthFormField>

							<AuthFormField
								label="Last Name"
								htmlFor="lastName"
								error={step2Form.formState.errors.lastName}
								required
							>
								<Input
									id="lastName"
									type="text"
									placeholder="Doe"
									className="h-11"
									disabled={isLoading}
									{...step2Form.register("lastName")}
								/>
							</AuthFormField>
						</div>

						{/* Company (Optional) */}
						<AuthFormField
							label="Company"
							htmlFor="company"
							error={step2Form.formState.errors.company}
							helperText="Optional - Your organization name"
						>
							<div className="relative">
								<Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									id="company"
									type="text"
									placeholder="Your company name"
									className="h-11 pl-10"
									disabled={isLoading}
									{...step2Form.register("company")}
								/>
							</div>
						</AuthFormField>

						{/* Navigation Buttons */}
						<div className="flex gap-3">
							<Button
								type="button"
								variant="outline"
								className="flex-1 h-11"
								onClick={goToPreviousStep}
								disabled={isLoading}
							>
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back
							</Button>

							<motion.div
								className="flex-1"
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
											Creating account...
										</>
									) : (
										<>
											Create account
											<CheckCircle2 className="ml-2 h-4 w-4" />
										</>
									)}
								</Button>
							</motion.div>
						</div>
					</motion.form>
				)}
			</AnimatePresence>
		</AuthLayout>
	);
}
