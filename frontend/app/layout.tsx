import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { DM_Sans, Geist, JetBrains_Mono } from "next/font/google";
import type React from "react";
import { ClientLayout } from "@/components/providers/client-layout";
import { ThemeProvider } from "@/components/shared/common/theme-provider";
import "./globals.css";

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-sans",
	display: "swap",
});

const dmSans = DM_Sans({
	subsets: ["latin"],
	variable: "--font-display",
	weight: ["400", "500", "600", "700"],
	display: "swap",
});

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	display: "swap",
});


export const metadata: Metadata = {
	title: "DSR Inc. - Waste Resource Management Platform",
	description:
		"AI-powered waste resource management and circularity solutions for industrial clients. Identify opportunities, assess profitability, and close deals.",
	generator: "v0.app",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geist.variable} ${dmSans.variable} ${jetbrains.variable} font-sans antialiased`}
			>

				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<ClientLayout>{children}</ClientLayout>
					<Analytics />
				</ThemeProvider>
			</body>
		</html>
	);
}
