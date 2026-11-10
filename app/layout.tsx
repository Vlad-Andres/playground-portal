import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "playground. · Your course, made interactive",
  description: "Create a beautiful, source-grounded learning playground from your course materials.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
