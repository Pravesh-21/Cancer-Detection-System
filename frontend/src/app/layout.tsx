import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CancerLens | AI-Assisted Oncology Diagnostic Workstation",
  description:
    "Clinical AI-assisted oncology diagnostic workstation. Automated domain routing and pathology classification for Brain, Lung, Breast, Bone, and Skin oncology scans.",
  keywords: [
    "CancerLens",
    "radiology imaging",
    "oncology classification",
    "DICOM viewer",
    "clinical decision support",
  ],
  authors: [{ name: "CancerLens Precision Oncology Core" }],
  robots: "noindex, nofollow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased bg-[#F3F8FB] text-[#0B2239] font-sans">
        {children}
      </body>
    </html>
  );
}
