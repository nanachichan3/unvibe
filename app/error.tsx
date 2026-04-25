'use client';

import { useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '32px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '480px',
      }}>
        <div style={{
          fontSize: '64px',
          fontFamily: 'Outfit',
          fontWeight: 800,
          color: 'var(--accent)',
          marginBottom: '16px',
          letterSpacing: '-0.03em',
        }}>
          Oops
        </div>
        <h2 style={{
          fontFamily: 'Outfit',
          fontSize: '22px',
          fontWeight: 600,
          marginBottom: '12px',
          color: 'var(--text-primary)',
        }}>
          Something went wrong
        </h2>
        <p style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          marginBottom: '28px',
          lineHeight: 1.6,
        }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '14px 28px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontFamily: 'Outfit',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
