import type { Metadata } from 'next';
import { EB_Garamond } from 'next/font/google';
import './globals.css';

const ebGaramond = EB_Garamond({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-garamond',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Proto-Vorlage — Torah Critical Apparatus',
  description:
    'Word-by-word alignment of Torah verses across Dead Sea Scrolls, Septuagint, Vulgate, and Masoretic Text',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${ebGaramond.variable} font-garamond`}>{children}</body>
    </html>
  );
}
