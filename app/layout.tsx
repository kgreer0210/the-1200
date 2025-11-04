import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { copy } from "@/lib/copy";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The 1200 Habit Tracking App",
  description:
    "Practice 20 minutes a day. Build real momentum. Track your progress toward 1,200 minutes of intentional practice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Providers>{children}</Providers>
        <footer className="border-t mt-auto py-4">
          <div className="container mx-auto max-w-4xl px-4">
            <p className="text-xs text-muted-foreground text-center">
              {copy.footer.legal}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
