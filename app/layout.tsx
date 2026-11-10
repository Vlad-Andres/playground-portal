import type { ReactNode } from "react";

export const metadata = {
  title: "Learning Playground Portal",
  description: "Create an interactive learning playground from course material.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: "0 auto", maxWidth: 760, padding: 32 }}>
        {children}
      </body>
    </html>
  );
}
