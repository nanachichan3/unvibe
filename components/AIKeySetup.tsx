'use client';

import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'unvibe_api_key';

/** Read the stored API key from localStorage */
export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Save API key to localStorage and return it */
export function saveApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch {
    // ignore
  }
}

/** Remove stored API key */
export function clearApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

interface AIKeySetupProps {
  /** If true, always shows compact form even when key is saved */
  compact?: boolean;
}

/**
 * Inline API key setup — shown prominently in AI mode.
 * Reads/writes localStorage automatically.
 */
export default function AIKeySetup({ compact = false }: AIKeySetupProps) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const stored = getStoredApiKey();
    if (stored) {
      setKey(stored);
      setSaved(true);
    } else {
      setShowForm(true);
    }
  }, []);

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    saveApiKey(trimmed);
    setSaved(true);
    setShowForm(false);
    // Notify all windows/tabs so game components refresh
    window.dispatchEvent(new Event('unvibe:api-key-changed'));
  };

  const handleClear = () => {
    clearApiKey();
    setKey('');
    setSaved(false);
    setShowForm(true);
    window.dispatchEvent(new Event('unvibe:api-key-changed'));
  };

  // ── Connected indicator (compact) ──────────────────────────────────────────
  if (saved && !showForm && !compact) {
    return (
      <div style={{
        padding: '8px 12px',
        background: 'rgba(52,211,153,0.06)',
        border: '1px solid rgba(52,211,153,0.15)',
        borderRadius: '6px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#34D399' }}>✓</span>
          <span style={{ fontSize: '11px', color: '#34D399', fontFamily: "'JetBrains Mono', monospace" }}>
            Gemini AI connected
          </span>
        </div>
        <button onClick={handleClear} style={{
          background: 'transparent', border: 'none', color: '#6a9955',
          fontSize: '10px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
        }}>
          change
        </button>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: '16px',
      background: 'rgba(86,156,214,0.06)',
      border: '1px solid rgba(86,156,214,0.2)',
      borderRadius: '8px',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: compact ? '10px' : '12px' }}>
        <span style={{ fontSize: '14px' }}>🔑</span>
        <p style={{ margin: 0, fontSize: '12px', color: '#d4d4d4', fontFamily: "'JetBrains Mono', monospace" }}>
          {saved ? 'Update Gemini API key' : 'Add Gemini API key for AI mode'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Paste your Gemini API key..."
          autoFocus
          style={{
            flex: 1, padding: '9px 12px',
            background: 'var(--bg-primary)', border: '1px solid rgba(86,156,214,0.3)',
            borderRadius: '4px', color: '#d4d4d4', fontSize: '12px',
            fontFamily: "'JetBrains Mono', monospace", outline: 'none',
          }}
        />
        <button
          onClick={handleSave}
          disabled={!key.trim()}
          style={{
            padding: '9px 14px',
            background: key.trim() ? '#569cd6' : 'rgba(86,156,214,0.3)',
            border: 'none', borderRadius: '4px', color: '#fff',
            fontSize: '12px', cursor: key.trim() ? 'pointer' : 'not-allowed',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {saved ? 'Update' : 'Save'}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: '10px', color: '#6a9955', fontFamily: "'JetBrains Mono', monospace" }}>
        Free tier: <a href="https://ai.google.dev/" target="_blank" rel="noopener" style={{ color: '#569cd6' }}>ai.google.dev →</a>
        {' · '}Stored locally in this browser only
      </p>
    </div>
  );
}
