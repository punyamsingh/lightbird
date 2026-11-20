import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../../../../packages/ui/src/styles/responsive.css";
import { StructuredData } from "@/components/structured-data";
import { isPreviewDeployment, pageMetadata, pages, projectStructuredData, SITE_URL } from "@/lib/site";
import { Toaster, FeatureFlagsProvider } from "@lightbird/player-react";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content" };

export const metadata: Metadata = {
  ...pageMetadata(pages.home),
  metadataBase: new URL(SITE_URL),
  applicationName: "LightBird",
  robots: isPreviewDeployment() ? { index: false, follow: false } : { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <StructuredData data={projectStructuredData} />
        <FeatureFlagsProvider>
          {children}
          <Toaster />
        </FeatureFlagsProvider>
      </body>
    </html>
  );
}
