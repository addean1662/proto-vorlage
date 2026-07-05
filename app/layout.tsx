import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Proto-Vorlage — Torah Critical Apparatus',
  description:
    'Word-by-word alignment of Torah verses across Dead Sea Scrolls, Septuagint, Vulgate, and Masoretic Text',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
