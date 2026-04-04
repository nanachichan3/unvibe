'use client';

import React from 'react';

interface TokenMeterProps {
  sessionTokens: number;
  roundTokens: number;
  visible?: boolean;
}

export default function TokenMeter({ sessionTokens, roundTokens, visible = true }: TokenMeterProps) {
  if (!visible || sessionTokens === 0) return null;

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '11px',
        color: '#9b87f5',
        padding: '6px 12px',
        background: 'rgba(155,135,245,0.08)',
        border: '1px solid rgba(155,135,245,0.2)',
        borderRadius: '4px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}
    >
      <span style={{ fontSize: '13px' }}>🤖</span>
      <span>AI mode</span>
      <span style={{ color: 'rgba(155,135,245,0.6)' }}>·</span>
      <span>
        round: <strong>~{roundTokens.toLocaleString()}</strong> tokens
      </span>
      <span style={{ color: 'rgba(155,135,245,0.6)' }}>·</span>
      <span>
        session: <strong>~{sessionTokens.toLocaleString()}</strong> tokens
      </span>
    </div>
  );
}
