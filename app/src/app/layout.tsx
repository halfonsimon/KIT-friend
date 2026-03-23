// src/app/layout.tsx
import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="Kit Friend" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Kit Friend" />
        <meta name="description" content="Keep in touch with your contacts" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#3b82f6" />

        {/* Icons */}
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="shortcut icon" href="/icons/icon.svg" />

        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
