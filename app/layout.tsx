import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sky HR — Attendance, Canteen & Payroll",
  description:
    "HR attendance, headcount verification, digital canteen and payroll attendance system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
