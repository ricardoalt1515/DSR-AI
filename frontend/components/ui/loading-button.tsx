"use client";

import * as React from "react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Reuse Button component's props pattern
type ButtonProps = React.ComponentProps<typeof Button>;

interface LoadingButtonProps extends ButtonProps {
	/** Whether the button is in loading state */
	loading?: boolean;
	/** Text to show while loading (defaults to children) */
	loadingText?: string;
}

/**
 * LoadingButton - Button with integrated loading spinner state.
 */
function LoadingButton({
	children,
	loading,
	loadingText,
	disabled,
	className,
	...props
}: LoadingButtonProps) {
	return (
		<Button
			disabled={disabled || loading}
			className={cn("relative", className)}
			{...props}
		>
			{loading && <Spinner className="mr-2 h-4 w-4" />}
			<span className={cn(loading && !loadingText && "invisible")}>
				{loading && loadingText ? loadingText : children}
			</span>
		</Button>
	);
}

export { LoadingButton, type LoadingButtonProps };
