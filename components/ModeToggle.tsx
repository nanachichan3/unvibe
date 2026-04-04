'use client';

import React from 'react';

interface ModeToggleProps {
  simple: boolean;
  onSimpleChange: (v: boolean) => void;
  roundTokens?: number;
}

export default function ModeToggle({ simple, onSimpleChange, roundTokens = 0 }: ModeToggleProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px',
        }}
      >
        {/* Simple option */}
        <button
          onClick={() => onSimpleChange(true)}
          style={{
            background: simple ? 'rgba(86,156,214,0.15)' : 'transparent',
            border: `1px solid ${simple ? '#569cd6' : '#333'}`,
            borderRadius: '4px',
            padding: '6px 12px',
            color: simple ? '#569cd6' : '#666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: simple ? '#569cd6' : 'transparent',
              border: `1px solid ${simple ? '#569cd6' : '#666'}`,
              display: 'inline-block',
              transition: 'all 0.2s',
            }}
          />
          Simple
          {simple && <span style={{ color: '#6a9955', fontSize: '10px' }}>●</span>}
        </button>

        {/* Separator */}
        <span style={{ color: '#444', fontSize: '12px' }}>──</span>

        {/* AI option */}
        <button
          onClick={() => onSimpleChange(false)}
          style={{
            background: !simple ? 'rgba(155,135,245,0.15)' : 'transparent',
            border: `1px solid ${!simple ? '#9b87f5' : '#333'}`,
            borderRadius: '4px',
            padding: '6px 12px',
            color: !simple ? '#9b87f5' : '#666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
          }}
        >
          {!simple && (
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#9b87f5',
                display: 'inline-block',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
          )}
          {simple && (
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: `1px solid #666`,
                display: 'inline-block',
              }}
            />
          )}
          AI
          {!simple && (
            <span style={{ color: '#9b87f5', fontSize: '11px' }}>+token counter</span>
          )}
        </button>
      </div>

      {/* Token cost display when AI mode */}
      {!simple && roundTokens > 0 && (
        <div
          style={{
            marginTop: '8px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: '#9b87f5',
            animation: 'fadeIn 0.3s ease-in',
          }}
        >
          ~{roundTokens.toLocaleString()} tokens this round
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
