'use client';

export default function Hero() {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      padding: '120px 0 80px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, 0.12) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '100px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#00f0ff',
              marginBottom: '24px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                background: '#00f0ff',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
              }} />
              Open Source
            </div>

            <h1 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '56px',
              fontWeight: 700,
              marginBottom: '24px',
              letterSpacing: '-0.02em',
            }}>
              Decode Your
              <br />
              <span className="gradient-text">Codebase</span>
              <br />
              Through Play
            </h1>

            <p style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '40px',
              maxWidth: '480px',
              lineHeight: 1.7,
            }}>
              Upload your code archive. Get instant insights. Play games that make your team actually understand the codebase. Reduce cognitive debt without the debt.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <a href="#start" className="btn-primary">Start Analyzing</a>
              <a href="https://github.com/yevgeniusr/unvibe" target="_blank" rel="noopener" className="btn-secondary">
                View on GitHub
              </a>
            </div>

            <div style={{
              display: 'flex',
              gap: '48px',
              marginTop: '60px',
              paddingTop: '40px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}>
              {[
                { value: '100%', label: 'Client-side' },
                { value: 'Any', label: 'Language' },
                { value: '∞', label: 'Games' },
              ].map(stat => (
                <div key={stat.label}>
                  <h3 style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '36px',
                    fontWeight: 700,
                    color: '#00f0ff',
                    marginBottom: '4px',
                  }}>
                    {stat.value}
                  </h3>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,240,255,0.1), rgba(168,85,247,0.1))',
              borderRadius: '24px',
              padding: '40px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>
                {'// Your codebase, visualized'}
              </div>
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                padding: '24px',
                overflow: 'auto',
                fontSize: '13px',
                lineHeight: 1.8,
              }}>
                <code style={{ color: '#fff' }}>
{`{
  "totalFiles": 847,
  "languages": [
    "TypeScript: 62%",
    "Python: 23%",
    "Markdown: 8%"
  ],
  "cognitiveLoad": "medium",
  "gamesGenerated": 24,
  "teamProgress": {
    "duels": 156,
    "accuracy": 78%
  }
}`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          section > div > div {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
        @media (max-width: 640px) {
          h1 { font-size: 36px !important; }
        }
      `}</style>
    </section>
  );
}
