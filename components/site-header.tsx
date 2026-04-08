'use client';

import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <svg className="brand-logo" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 9h12M8 14h8M8 19h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="20" cy="19" r="2.5" fill="currentColor" opacity="0.4"/>
        </svg>
        <span className="brand-name">unvibe</span>
      </Link>
      <nav className="site-nav">
        <a href="https://github.com/nanachichan3/unvibe" target="_blank" rel="noreferrer">
          View Source
        </a>
        <a href="https://github.com/nanachichan3/unvibe/issues" target="_blank" rel="noreferrer">
          Report Issue
        </a>
      </nav>
    </header>
  );
}
