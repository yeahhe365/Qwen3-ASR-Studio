import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ASR Studio ModelScope API",
  description: "ModelScope / Gradio proxy and demo pages for Qwen3-ASR transcription workflows.",
  keywords: ["Qwen3-ASR", "ModelScope", "Gradio", "ASR", "speech transcription", "Next.js"],
  authors: [{ name: "ASR Studio" }],
  openGraph: {
    title: "ASR Studio ModelScope API",
    description: "ModelScope / Gradio proxy for Qwen3-ASR transcription.",
    siteName: "ASR Studio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ASR Studio ModelScope API",
    description: "ModelScope / Gradio proxy for Qwen3-ASR transcription.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
