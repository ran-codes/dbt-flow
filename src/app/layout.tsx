import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "dbt-planner | Interactive dbt Lineage Visualization & Planning Tool",
  description: "Free browser-based tool for visualizing dbt project lineage, planning model changes, and analyzing data pipeline dependencies. No backend required - works with any manifest.json.",
  keywords: ["dbt", "dbt lineage", "dbt visualization", "data lineage", "DAG visualization", "dbt manifest", "data pipeline", "dbt planning", "dbt impact analysis", "data modeling", "analytics engineering"],
  authors: [{ name: "dbt-planner" }],
  openGraph: {
    title: "dbt-planner | Interactive dbt Lineage Visualization",
    description: "Visualize your dbt DAG, plan model changes, and analyze dependencies - all in your browser. Free and open source.",
    type: "website",
    url: "https://ranli.dev/dbt-planner/",
    siteName: "dbt-planner",
  },
  twitter: {
    card: "summary_large_image",
    title: "dbt-planner | dbt Lineage Visualization Tool",
    description: "Free browser-based tool for visualizing dbt lineage and planning model changes.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-332T7B5812"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-332T7B5812');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
