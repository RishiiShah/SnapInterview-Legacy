import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "SnapInterview — Ace Your Next Interview",
    description:
        "Practice mock interviews with AI, get instant feedback, and land your dream job with confidence.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning className="overflow-x-hidden bg-white dark:bg-zinc-950">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen w-full flex flex-col overflow-x-hidden`}>
                <Providers>
                    <main className="flex-1 w-full flex flex-col">
                        {children}
                    </main>
                </Providers>
            </body>
        </html >
    );
}
