import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConditionalHeader from "@/components/ConditionalHeader";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Candice AI",
  description: "Your AI Agent for candidate interviews",
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
      <main className="flex-1 flex flex-col">{children}</main>
    </>
  );

  const body = (
    <body className="min-h-screen flex flex-col">
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

