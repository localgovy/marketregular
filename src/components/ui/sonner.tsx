"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  BangMark,
  CheckMark,
  CloseMark,
  PlateMark,
  WeekMark,
} from "@/components/marks"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CheckMark className="size-4" />
        ),
        info: (
          <PlateMark className="size-4" />
        ),
        warning: (
          <BangMark className="size-4" />
        ),
        error: (
          <CloseMark className="size-4" />
        ),
        loading: (
          <WeekMark className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
