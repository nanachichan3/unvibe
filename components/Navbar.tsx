'use client';

import { Github, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      setScrolled(window.scrollY > 50);
    });
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: '20px 0',
      background: scrolled ? 'rgba(3, 5, 8, 0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #00f0ff, #ff00ff)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 700,
            fontSize: '20px',
            color: '#000',
          }}>
            U
          </div>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: '#fff',
          }}>
            UN<span style={{ color: '#00f0ff' }}>VIBE</span>
          </span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <div style={{ display: 'flex', gap: '32px' }} className="desktop-nav">
            <a href="#features" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Features</a>
            <a href="#how" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>How it Works</a>
            <a href="#games" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Games</a>
            <a href="https://github.com/yevgeniusr/unvibe" target="_blank" rel="noopener" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
              <Github size={18} />
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
