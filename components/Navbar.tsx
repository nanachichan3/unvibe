'use client';

import { useState, useEffect } from 'react';
import { Github, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: scrolled ? '12px 0' : '20px 0',
        background: scrolled ? 'rgba(13,13,18,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-subtle)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'var(--gradient-accent)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Outfit',
              fontWeight: 800,
              fontSize: '18px',
              color: '#fff',
              flexShrink: 0,
            }}>
              U
            </div>
            <span style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
              UN<span style={{ color: 'var(--accent)' }}>VIBE</span>
            </span>
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="desktop-nav">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How it Works', href: '#how' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}
              >
                {label}
              </a>
            ))}
            <a
              href="https://github.com/nanachichan3/unvibe"
              target="_blank"
              rel="noopener"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}
            >
              <Github size={16} />
              Open Source
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px', display: 'none',
            }}
            className="mobile-btn"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99, background: 'var(--bg-primary)',
          paddingTop: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px',
        }}>
          {[
            { label: 'Features', href: '#features' },
            { label: 'How it Works', href: '#how' },
            { label: 'GitHub', href: 'https://github.com/nanachichan3/unvibe' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '24px', fontFamily: 'Outfit', fontWeight: 600 }}
            >
              {label}
            </a>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
