import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "St. Jude Radiologic Diagnostic Suite | AI-Assisted Clinical Imaging",
  description:
    "Clinical-grade AI-assisted radiologic diagnostic workstation. Automated domain routing and pathology classification for Brain, Lung, Breast, Bone, and Skin oncology scans.",
  keywords: [
    "radiology imaging",
    "medical imaging",
    "diagnostic suite",
    "oncology classification",
    "DICOM viewer",
    "clinical decision support",
  ],
  authors: [{ name: "St. Jude Diagnostic Imaging — Department of AI-Assisted Radiology" }],
  robots: "noindex, nofollow", // Clinical system — no search indexing
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased bg-[#F8FAFC] text-slate-900">
        {children}
      </body>
    </html>
  );
}
