import type { Metadata } from 'next';
import { Outfit, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { PostHogProvider } from '@posthog/react-server';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

// PostHog server-side initialization
function PostHogInit() {
  const posthogApiKey = process.env.POSTHOG_API_KEY;
  const posthogHost = process.env.POSTHOG_HOST || 'https://app.posthog.com';

  if (posthogApiKey) {
    return (
      <PostHogProvider
        apiKey={posthogApiKey}
        apiHost={posthogHost}
        person_profiles="identified_only"
      />
    );
  }
  return null;
}

export const metadata: Metadata = {
  title: 'Unvibe — Decode Your Codebase',
  description: 'Turn your code into games. Reduce cognitive debt through play.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        <PostHogInit />
        {children}
      </body>
    </html>
  );
}
