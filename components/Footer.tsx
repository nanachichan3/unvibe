'use client';

import { Github, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      padding: '40px 0',
      borderTop: '1px solid var(--border-subtle)',
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '30px',
            height: '30px',
            background: 'var(--gradient-accent)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Outfit',
            fontWeight: 800,
            fontSize: '14px',
            color: '#fff',
            flexShrink: 0,
          }}>
            U
          </div>
          <span style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            UN<span style={{ color: 'var(--accent)' }}>VIBE</span>
          </span>
        </a>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Open source · Built for developers who ship
        </p>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a
            href="https://github.com/nanachichan3/unvibe"
            target="_blank"
            rel="noopener"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}
          >
            <Github size={15} /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
