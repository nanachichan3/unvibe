'use client';

const features = [
  {
    icon: '📊',
    title: 'Instant Analytics',
    description: 'Drop your code, get metrics in seconds. File counts, language distribution, complexity signals — all client-side.',
  },
  {
    icon: '🎮',
    title: 'Code Games',
    description: 'Turn your actual codebase into quizzes. Guess the file, component duels, dependency paths. Learning your code has never been fun.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Insights',
    description: 'Bring your own API key. Get cognitive debt analysis, architecture insights, and AI-generated questions tailored to your code.',
  },
  {
    icon: '🔒',
    title: '100% Private',
    description: 'Your code never leaves your browser for core analytics. No uploads, no servers, no logging. Optional AI only when you trigger it.',
  },
  {
    icon: '🌍',
    title: 'Any Language',
    description: 'JavaScript, Python, Rust, Go, or COBOL — if it\'s in your archive, we analyze it. No language-specific setup required.',
  },
  {
    icon: '👥',
    title: 'Team Building',
    description: 'Games work for individuals or teams. Track progress, build shared understanding, reduce onboarding time.',
  },
];

export default function Features() {
  return (
    <section id="features" style={{
      padding: '120px 0',
      background: 'linear-gradient(180deg, transparent 0%, rgba(168,85,247,0.03) 50%, transparent 100%)',
    }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 64px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#ff00ff',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: '16px',
          }}>
            Features
          </div>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '42px',
            fontWeight: 700,
            marginBottom: '16px',
          }}>
            Why Unvibe?
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>
            Transform code understanding from a chore into a game. Built for developers who ship.
          </p>
        </div>

        <div className="grid-3">
          {features.map((feature, i) => (
            <div key={i} className="card" style={{ cursor: 'default' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15))',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px',
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '12px',
              }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
