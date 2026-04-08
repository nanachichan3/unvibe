'use client';

import { Shield, Gamepad2, Brain, Lock, Globe, Users } from 'lucide-react';

const features = [
  {
    icon: Brain,
    tag: 'Analytics',
    title: 'Instant Codebase Metrics',
    desc: 'Drop your code, get files, languages, complexity, and largest files — in seconds. All client-side, no uploads.',
    wide: true,
  },
  {
    icon: Gamepad2,
    tag: 'Games',
    title: '14 Code Games',
    desc: 'Guess the File, Find the Bug, Trace the Call, Spot the Vulnerability, and more — all built from your actual codebase.',
    wide: false,
  },
  {
    icon: Shield,
    tag: 'AI · BYOK',
    title: 'AI-Powered Insights',
    desc: 'Add your own API key. Get cognitive debt analysis and AI-generated questions tailored to your code.',
    wide: false,
  },
  {
    icon: Lock,
    tag: 'Privacy',
    title: '100% Private',
    desc: 'Your code never leaves your browser. No uploads, no servers, no logging.',
    wide: false,
  },
  {
    icon: Globe,
    tag: 'Any Language',
    title: '50+ Languages',
    desc: 'JavaScript, Python, Rust, Go, TypeScript, Ruby, or COBOL — if it\'s in your archive, we analyze it.',
    wide: false,
  },
  {
    icon: Users,
    tag: 'GitHub',
    title: 'GitHub Integration',
    desc: 'Connect any public repository by URL. Fetch files directly without downloading a zip.',
    wide: false,
  },
];

export default function Features() {
  return (
    <section id="features">
      <p className="panel-label" style={{ textAlign: 'center', marginBottom: 8 }}>Why Unvibe</p>
      <h2 className="panel-title" style={{ textAlign: 'center', marginBottom: 40 }}>
        Everything you need to understand your codebase
      </h2>

      <div className="feature-grid">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className={`feat ${f.wide ? 'feat-wide' : 'feat-third'}`}>
              <div className="feat-icon">
                <Icon size={18} />
              </div>
              <span className="feat-tag">{f.tag}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
