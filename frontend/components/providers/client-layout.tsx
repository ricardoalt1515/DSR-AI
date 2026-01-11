"use client";

import { Suspense } from "react";
import { Toaster } from "sonner";
import { OrgContextGuard } from "@/components/features/org-context";
import { CommandPalette } from "@/components/shared/command-palette";
import { NavBar } from "@/components/shared/layout/navbar";
import { AuthProvider } from "@/lib/contexts";

export function ClientLayout({ children }: { children: React.ReactNode }) {
	return (
		<AuthProvider>
			<OrgContextGuard>
				<Suspense fallback={null}>
					<div className="aqua-page min-h-screen">
						<NavBar />
						<main
							id="main-content"
							className="mx-auto w-full max-w-[1600px] px-8 py-10 md:px-12 lg:px-16"
						>
							<div className="flex flex-col gap-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
								{children}
							</div>
						</main>
					</div>
					<CommandPalette />
					<Toaster
						position="bottom-right"
						theme="system"
						richColors
						closeButton
						toastOptions={{
							classNames: {
								toast: "bg-background border-border shadow-lg",
								title: "text-foreground font-semibold",
								description: "text-muted-foreground",
								actionButton:
									"bg-primary text-primary-foreground hover:bg-primary/90",
								cancelButton:
									"bg-muted text-muted-foreground hover:bg-muted/80",
								closeButton: "bg-background border-border hover:bg-muted",
								success: "bg-background border-border",
								error: "bg-background border-border",
								warning: "bg-background border-border",
								info: "bg-background border-border",
							},
						}}
					/>
				</Suspense>
			</OrgContextGuard>
		</AuthProvider>
	);
}
