"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { Toaster } from "@workspace/ui/components/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        {children}
        <Toaster />
      </NextThemesProvider>
    </SessionProvider>
  )
}
