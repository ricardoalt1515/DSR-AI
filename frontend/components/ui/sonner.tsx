"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

type SonnerTheme = "light" | "dark" | "system"

const isValidTheme = (theme: string | undefined): theme is SonnerTheme =>
  theme === "light" || theme === "dark" || theme === "system"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  const resolvedTheme: SonnerTheme = isValidTheme(theme) ? theme : "system"

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:border-success/30 group-[.toaster]:bg-success/10",
          error:
            "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/10",
          warning:
            "group-[.toaster]:border-warning/30 group-[.toaster]:bg-warning/10",
          info:
            "group-[.toaster]:border-primary/30 group-[.toaster]:bg-primary/10",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
