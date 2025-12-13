"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    /** Position of the addon */
    position?: "left" | "right";
}

/**
 * InputGroup - Flexible wrapper for inputs with prefixes, suffixes, icons, and actions.
 * Based on shadcn/ui Input Group pattern (October 2025).
 *
 * Usage:
 * ```tsx
 * <InputGroup>
 *   <InputGroupAddon position="left">
 *     <DollarSign className="h-4 w-4 text-muted-foreground" />
 *   </InputGroupAddon>
 *   <Input placeholder="Amount" />
 *   <InputGroupAddon position="right">
 *     <span className="text-muted-foreground text-sm">USD</span>
 *   </InputGroupAddon>
 * </InputGroup>
 * ```
 */
function InputGroup({ className, children, ...props }: InputGroupProps) {
    return (
        <div
            className={cn(
                "flex items-center rounded-md border border-input bg-background ring-offset-background",
                "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                "has-[input:disabled]:opacity-50 has-[input:disabled]:cursor-not-allowed",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

function InputGroupAddon({
    className,
    children,
    position = "left",
    ...props
}: InputGroupAddonProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-center px-3 text-muted-foreground",
                position === "left" && "border-r border-input",
                position === "right" && "border-l border-input",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

/**
 * InputGroupInput - Input styled for use within InputGroup (no border/ring)
 */
const InputGroupInput = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
    return (
        <input
            ref={ref}
            className={cn(
                "flex h-10 w-full bg-transparent px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-0",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                className
            )}
            {...props}
        />
    );
});
InputGroupInput.displayName = "InputGroupInput";

export { InputGroup, InputGroupAddon, InputGroupInput };
