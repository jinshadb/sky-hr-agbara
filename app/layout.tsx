import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sky HR — Attendance & Canteen",
  description:
    "HR attendance, headcount verification and digital canteen management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
