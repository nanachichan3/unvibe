'use client';

import { Github, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      padding: '40px 0',
      borderTop: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #00f0ff, #ff00ff)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 700,
            fontSize: '16px',
            color: '#000',
          }}>
            U
          </div>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '16px',
            fontWeight: 700,
            color: '#fff',
          }}>
            UN<span style={{ color: '#00f0ff' }}>VIBE</span>
          </span>
        </div>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          Open source · Built for developers who ship
        </p>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a
            href="https://github.com/yevgeniusr/unvibe"
            target="_blank"
            rel="noopener"
            style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Github size={16} /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
