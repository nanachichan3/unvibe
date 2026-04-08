'use client';

import { Upload, BarChart3, Gamepad2, Sparkles } from 'lucide-react';

const steps = [
  {
    num: '01',
    title: 'Export',
    desc: 'Zip any project folder on your machine — your IDE build, a cloned repo, anything.',
  },
  {
    num: '02',
    title: 'Upload',
    desc: 'Drop the archive on the upload zone. Parsing runs instantly in your browser — nothing is sent to a server.',
  },
  {
    num: '03',
    title: 'Explore',
    desc: 'Browse your codebase stats, language distribution, and largest files. No guesswork about what\'s in there.',
  },
  {
    num: '04',
    title: 'Play & Learn',
    desc: '14 different games turn your actual code into challenges. Add an AI key for deeper insights and harder questions.',
  },
];

export default function HowItWorks() {
  return (
    <section className="how-band" id="how">
      <p className="panel-label">How it works</p>
      <h2 className="panel-title">Four steps to clarity</h2>

      <div className="steps-row">
        {steps.map((step) => (
          <div className="step-item" key={step.num}>
            <div className="step-num">{step.num}</div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
