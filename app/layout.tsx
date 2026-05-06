import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Figtree } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";

const figtreeHeading = Figtree({
  subsets: ["latin"],
  variable: "--font-heading",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

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
    default: "RBAC Console",
    template: "%s | RBAC Console",
  },
  description:
    "Enterprise role and access console for reviewing workbook-derived RBAC permissions and administering role changes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        spaceGrotesk.variable,
        figtreeHeading.variable,
      )}
    >
      <body className="flex h-dvh w-full overflow-hidden text-[15px]">
        <SidebarNav />
        <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
