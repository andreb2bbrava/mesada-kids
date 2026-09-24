import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "Mesada Kids",
    template: "%s | Mesada Kids",
  },
  description:
    "Mesada Kids — tarefas, conquistas e educação financeira para toda a família.",
  applicationName: "Mesada Kids",
  icons: {
    icon: "/branding/mesada-kids-logo.png",
    shortcut: "/branding/mesada-kids-logo.png",
    apple: "/branding/mesada-kids-logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}