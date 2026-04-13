import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConditionalHeader from "@/components/ConditionalHeader";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Screen AI",
  description: "Your AI Agent for candidate interviews",
  icons: { icon: '/images/favicon.png' },
};

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <>
      <ConditionalHeader hasClerk={!!clerkPublishableKey} />
      <main className="flex-1 flex flex-col overflow-y-auto">{children}</main>
    </>
  );

  const body = (
    <body className="h-screen overflow-hidden flex flex-col">
      <ThemeProvider>
        {content}
      </ThemeProvider>
    </body>
  );

  if (clerkPublishableKey) {
    return (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <html lang="en" suppressHydrationWarning>
          {body}
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      {body}
    </html>
  );
}

