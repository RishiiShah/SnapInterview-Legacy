import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const newsreader = Newsreader({
    variable: "--font-newsreader",
    subsets: ["latin"],
    style: ["normal", "italic"],
});

export const metadata: Metadata = {
    metadataBase: new URL("https://snapinterview.app"),
    title: {
        template: "%s | SnapInterview",
        default: "SnapInterview | AI Mock Interview Platform",
    },
    description:
        "Practice mock interviews with AI, get instant feedback, and land your dream job with confidence.",
    openGraph: {
        title: "SnapInterview | AI Mock Interview Platform",
        description: "Practice mock interviews with AI, get instant feedback, and land your dream job with confidence.",
        url: "https://snapinterview.app",
        siteName: "SnapInterview",
        images: [
            {
                url: "/og-image.jpg",
                width: 1200,
                height: 630,
                alt: "SnapInterview Preview",
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "SnapInterview | AI Mock Interview Platform",
        description: "Practice mock interviews with AI, get instant feedback, and land your dream job.",
    },
    icons: {
        icon: [{ url: "/favicon.ico", sizes: "any" }],
        shortcut: "/favicon.ico",
        // PNG stays sharper for sidebar/login; .ico is for browser tabs only.
        apple: "/logo.png",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning className="overflow-x-hidden bg-[#0B0C10]">
            <body className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased min-h-screen w-full flex flex-col overflow-x-hidden bg-[#0B0C10] text-[#F2F4F8]`}>
                <main className="flex-1 w-full flex flex-col">
                    {children}
                </main>
                <Analytics />
            </body>
        </html>
    );
}
