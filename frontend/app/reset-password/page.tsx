"use client";

import { AuthLayout } from "@/components/features/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ResetPasswordPage() {
	return (
		<AuthLayout
			title="Password reset via admin"
			subtitle="This platform does not support resetting passwords via email links."
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
					To change your password, please contact your organization admin. They
					can set a new password for your account in the admin panel and share
					it securely with you.
				</p>
				<Button asChild variant="outline" className="w-full mt-2">
					<Link href="/login">Go to sign in</Link>
				</Button>
			</div>
		</AuthLayout>
	);
}
