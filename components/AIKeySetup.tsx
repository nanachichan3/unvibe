'use client';

import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'unvibe_api_key';

interface AIKeySetupProps {
  /** If true, always shows the compact form (even when key is saved) */
  compact?: boolean;
  /** Called when key is saved — useful for components that need to propagate the key */
  onKeySaved?: (key: string) => void;
  /** Show only when in AI mode and no key is configured. Default: always show if no key */
  aiModeOnly?: boolean;
}

/**
 * Inline Gemini API key setup.
 * Reads/writes to localStorage automatically.
 * Shown prominently when no key is configured.
 */
export default function AIKeySetup({ compact = false, onKeySaved }: AIKeySetupProps) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setKey(stored);
        setSaved(true);
      } else {
        setShowForm(true);
      }
    } catch {
      setShowForm(true);
    }
  }, []);

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
      setSaved(true);
      setShowForm(false);
      onKeySaved?.(trimmed);
    } catch {
      // localStorage not available
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setKey('');
      setSaved(false);
      setShowForm(true);
    } catch {
      // ignore
    }
  };

  // ── Full banner (non-compact, aiModeOnly keeps form visible) ─────────────
  if (!compact && !saved && !showForm && !key) {
    return (
      <div
        style={{
          padding: '16px 20px',
          background: 'rgba(86,156,214,0.06)',
          border: '1px solid rgba(86,156,214,0.2)',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '20px' }}>🔑</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#d4d4d4', fontFamily: "'JetBrains Mono', monospace" }}>
            Add a Gemini API key to enable AI-powered games
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6a9955', fontFamily: "'JetBrains Mono', monospace" }}>
            Your key is stored locally. <a href="https://ai.google.dev/" target="_blank" rel="noopener" style={{ color: '#569cd6' }}>Get free key →</a>
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '8px 16px',
            background: '#569cd6',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Add Key
        </button>
      </div>
    );
  }

  // ── Form (inline) ──────────────────────────────────────────────────────────
  if (!saved && showForm) {
    return (
      <div
        style={{
          padding: compact ? '12px' : '20px',
          background: 'rgba(86,156,214,0.06)',
          border: '1px solid rgba(86,156,214,0.2)',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '16px' }}>🔑</span>
          <p style={{ margin: 0, fontSize: '13px', color: '#d4d4d4', fontFamily: "'JetBrains Mono', monospace" }}>
            Gemini API key for AI games
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Paste your Gemini API key..."
            autoFocus
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'var(--bg-primary)',
              border: '1px solid rgba(86,156,214,0.3)',
              borderRadius: '4px',
              color: '#d4d4d4',
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              outline: 'none',
            }}
          />
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            style={{
              padding: '10px 16px',
              background: key.trim() ? '#569cd6' : 'rgba(86,156,214,0.3)',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              cursor: key.trim() ? 'pointer' : 'not-allowed',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Save
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: '#6a9955', fontFamily: "'JetBrains Mono', monospace" }}>
          Free tier: <a href="https://ai.google.dev/" target="_blank" rel="noopener" style={{ color: '#569cd6' }}>ai.google.dev →</a>
          {' · '}
          Your key is stored only in this browser
        </p>
      </div>
    );
  }

  // ── Saved indicator (compact, shown when key exists) ──────────────────────
  if (saved) {
    return (
      <div
        style={{
          padding: '8px 12px',
          background: 'rgba(52,211,153,0.06)',
          border: '1px solid rgba(52,211,153,0.15)',
          borderRadius: '6px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px' }}>✓</span>
          <span style={{ fontSize: '11px', color: '#34D399', fontFamily: "'JetBrains Mono', monospace" }}>
            Gemini AI connected
          </span>
        </div>
        <button
          onClick={handleClear}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6a9955',
            fontSize: '10px',
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '2px 4px',
          }}
        >
          change
        </button>
      </div>
    );
  }

  return null;
}

/** Read the stored API key (for use in game components) */
export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
