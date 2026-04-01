'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '32px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{
          fontSize: '80px',
          fontFamily: 'Outfit',
          fontWeight: 800,
          background: 'var(--gradient-accent)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '16px',
          letterSpacing: '-0.03em',
        }}>
          404
        </div>
        <h1 style={{
          fontFamily: 'Outfit',
          fontSize: '24px',
          fontWeight: 600,
          marginBottom: '12px',
          color: 'var(--text-primary)',
        }}>
          Page not found
        </h1>
        <p style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          marginBottom: '32px',
          lineHeight: 1.6,
        }}>
          This page doesn&apos;t exist. Maybe the archive you uploaded had an unusual structure.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 28px',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: '10px',
            fontFamily: 'Outfit',
            fontWeight: 600,
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          Back to Unvibe
        </Link>
      </div>
    </div>
  );
}
