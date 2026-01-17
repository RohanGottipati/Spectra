import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spectra",
  description: "Simplicity is the ultimate sophistication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.cdnfonts.com/css/satoshi"
          rel="stylesheet"
        />
      </head>
      <body className={`${geistMono.variable} antialiased`} style={{ fontFamily: "'Satoshi', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
