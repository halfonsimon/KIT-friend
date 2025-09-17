// src/app/layout.tsx
import type { ReactNode } from "react";
import "./globals.css"; // ✅ global CSS is allowed only here

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900">{children}</body>
    </html>
  );
}
