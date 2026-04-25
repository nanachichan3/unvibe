import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.0,

  // Set `environment` tag for filtering in Sentry dashboard
  environment: process.env.NODE_ENV,

  // Capture replay for sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable source maps for better debugging
  sourcemaps: {
    assets: [".next/**/*.map"],
  },
});
