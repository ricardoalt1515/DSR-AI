"use client";

import { AuthLayout } from "@/components/features/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RegisterPage() {
	return (
		<AuthLayout
			title="Registration disabled"
			subtitle="Accounts are created and managed by your organization admin."
			footer={
				<Link
					href="/login"
					className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
				>
					Back to sign in
				</Link>
			}
		>
			<div className="space-y-4 text-sm text-muted-foreground">
				<p>
					Self-service registration is not available. To access the platform, please contact your
					team admin so they can create an account for you.
				</p>
				<Button asChild variant="outline" className="w-full mt-2">
					<Link href="/login">Go to sign in</Link>
				</Button>
			</div>
		</AuthLayout>
	);
}

/*
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
*/
