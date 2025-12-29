// app/layout.tsx
import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Bee Research Agent",
  description: "Honey-sweet AI research assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#080708] text-amber-50 antialiased"
      >
        {children}
      </body>
    </html>
  );
}
