'use client';

const steps = [
  {
    num: '01',
    title: 'Export Your Code',
    description: 'Create a zip archive of any project folder. Include as much or as little as you want — from a single module to your entire monorepo.',
  },
  {
    num: '02',
    title: 'Drop It Here',
    description: 'Upload your archive. Parsing happens instantly in your browser — nothing is uploaded to any server for core analysis.',
  },
  {
    num: '03',
    title: 'Explore & Play',
    description: 'See metrics, complexity signals, and language breakdown. Then jump into games built from your actual code.',
  },
  {
    num: '04',
    title: 'Level Up with AI',
    description: 'Add your own OpenAI or Gemini key to unlock deeper insights, cognitive debt analysis, and unlimited AI-generated questions.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how" style={{ padding: '120px 0' }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 64px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#00f0ff',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: '16px',
          }}>
            How it Works
          </div>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '42px',
            fontWeight: 700,
          }}>
            Four Steps to Clarity
          </h2>
        </div>

        <div className="grid-2">
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '48px',
                fontWeight: 700,
                color: 'rgba(0, 240, 255, 0.3)',
                lineHeight: 1,
                minWidth: '60px',
              }}>
                {step.num}
              </div>
              <div>
                <h3 style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '20px',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
