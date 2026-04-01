'use client';

import { Upload, BarChart3, Gamepad2, Sparkles } from 'lucide-react';

const steps = [
  { icon: Upload, num: '01', title: 'Export', desc: 'Zip any project folder' },
  { icon: BarChart3, num: '02', title: 'Upload', desc: 'Drop it — parsing is instant' },
  { icon: Gamepad2, num: '03', title: 'Play', desc: 'Games built from your code' },
  { icon: Sparkles, num: '04', title: 'Level Up', desc: 'Add AI key for deeper insights' },
];

export default function HowItWorks() {
  return (
    <section id="how" className="section" style={{ background: 'var(--bg-secondary)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={{
            fontFamily: 'Outfit',
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}>
            Four steps to clarity
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2px',
          background: 'var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
        }}>
          {steps.map(({ icon: Icon, num, title, desc }, i) => (
            <div
              key={i}
              className="animate-fade-up"
              style={{
                padding: '40px 32px',
                background: 'var(--bg-card)',
                animationDelay: `${i * 100}ms`,
                textAlign: 'center',
              }}
            >
              <div style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--accent)',
                letterSpacing: '0.1em',
                marginBottom: '20px',
              }}>
                {num}
              </div>
              <div className="icon-box" style={{
                width: '56px', height: '56px',
                margin: '0 auto 20px',
                background: 'var(--accent-subtle)',
              }}>
                <Icon size={24} color="var(--accent)" strokeWidth={1.75} />
              </div>
              <h3 style={{
                fontFamily: 'Outfit',
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '6px',
              }}>
                {title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .container > div:last-child > div:first-child {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .container > div:last-child > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
