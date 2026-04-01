'use client';

import { Shield, Gamepad2, Brain, Lock, Globe, Users } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Instant Analytics',
    description: 'Drop your code, get metrics in seconds. Files, languages, complexity — all client-side, no uploads.',
  },
  {
    icon: Gamepad2,
    title: 'Code Games',
    description: 'Turn your actual codebase into quizzes. Guess the file, component duels, dependency paths.',
  },
  {
    icon: Shield,
    title: 'AI-Powered Insights',
    description: 'Bring your own API key. Get cognitive debt analysis and AI-generated questions tailored to your code.',
  },
  {
    icon: Lock,
    title: '100% Private',
    description: 'Your code never leaves your browser. No uploads, no servers, no logging.',
  },
  {
    icon: Globe,
    title: 'Any Language',
    description: 'JavaScript, Python, Rust, Go, or COBOL — if it\'s in your archive, we analyze it.',
  },
  {
    icon: Users,
    title: 'Team Building',
    description: 'Games work solo or with your team. Track progress, build shared understanding.',
  },
];

export default function Features() {
  return (
    <section id="features" className="section" style={{
      background: 'linear-gradient(180deg, transparent 0%, rgba(123,92,255,0.03) 50%, transparent 100%)',
    }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div className="badge" style={{ marginBottom: '20px', display: 'inline-flex' }}>
            Why Unvibe
          </div>
          <h2 style={{
            fontFamily: 'Outfit',
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 700,
            marginBottom: '16px',
            letterSpacing: '-0.02em',
          }}>
            Everything you need to
            <br />
            <span className="gradient-text">understand your code</span>
          </h2>
          <p style={{ fontSize: '17px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
            No installs, no signups, no data collection. Just upload and play.
          </p>
        </div>

        <div className="grid-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="card animate-fade-up"
                style={{
                  padding: '32px',
                  animationDelay: `${i * 80}ms`,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div className="icon-box" style={{ marginBottom: '20px' }}>
                  <Icon size={22} color="var(--accent)" strokeWidth={1.75} />
                </div>
                <h3 style={{
                  fontFamily: 'Outfit',
                  fontSize: '18px',
                  fontWeight: 600,
                  marginBottom: '10px',
                  letterSpacing: '-0.01em',
                }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
