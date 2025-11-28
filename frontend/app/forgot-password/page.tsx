"use client";

import { AuthLayout } from "@/components/features/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ForgotPasswordPage() {
	return (
		<AuthLayout
			title="Password reset via admin"
			subtitle="This platform does not use email-based password reset."
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
					If you&apos;ve forgotten your password, please contact your organization admin. They
					can reset your password from the admin panel and share the new credentials with you.
				</p>
				<Button asChild variant="outline" className="w-full mt-2">
					<Link href="/login">Go to sign in</Link>
				</Button>
			</div>
		</AuthLayout>
	);
}
