import type { Metadata } from 'next';
import { Inter, Public_Sans } from 'next/font/google';
import './globals.css';

/*
 * The legacy pages pulled Public Sans + Inter from the Google Fonts CDN. Loading
 * them through next/font keeps the same faces and weights while self-hosting, so
 * there is no render-blocking request and no layout shift.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-public-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ZPPSU SmartMin',
  description:
    'Institutional governance and AI meeting assistant for Zamboanga Peninsula Polytechnic State University',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${publicSans.variable}`}>
      <head>
        {/*
          Material Symbols Outlined is an icon font used all over the UI as
          <span className="material-symbols-outlined">name</span>. next/font
          cannot host it: the glyph is selected by ligature at render time, so
          the full variable font has to come from the CDN.
        */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background min-h-screen">{children}</body>
    </html>
  );
}
