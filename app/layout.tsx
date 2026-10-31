import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ม่านใจ · ดูดวงเพื่อสำรวจใจ | MOONMIND",
  description: "พื้นที่สนทนา AI ในบรรยากาศดูดวง เพื่อทบทวนความรู้สึกและเข้าใจตัวเองอย่างอ่อนโยน ไม่อ่านใจจริง ไม่ทำนายอนาคต และไม่วินิจฉัย",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}
