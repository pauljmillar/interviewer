import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Candice",
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
      <Header hasClerk={!!clerkPublishableKey} />
      <main className="flex-1 flex flex-col">{children}</main>
    </>
  );

  const body = (
    <body className="min-h-screen flex flex-col">
      {content}
    </body>
  );

  if (clerkPublishableKey) {
    return (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <html lang="en">
          {body}
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html lang="en">
      {body}
    </html>
  );
}

