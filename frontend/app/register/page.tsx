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
