'use client';

import { useState, useCallback, useRef } from 'react';

interface LandingUploadProps {
  onFile: (file: File) => void;
}

export default function LandingUpload({ onFile }: LandingUploadProps) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    onFile(file);
  }, [onFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <section className="upload-panel" id="upload">
      <p className="panel-label">Step 1 — Start here</p>
      <h2 className="panel-title">Drop your code archive</h2>

      <div
        className={`upload-zone${dragging ? ' upload-zone--drag' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload code archive"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.tar,.gz,.tar.gz"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <div className="upload-orb">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4m0 0L8 8m4-4l4 4" />
            <path d="M4 20h16" />
          </svg>
        </div>
        <p className="upload-title">Drag &amp; drop your archive</p>
        <p className="upload-sub">
          Supports <strong>zip</strong>, <strong>tar</strong>, and <strong>tar.gz</strong> archives<br />
          Your code never leaves this browser
        </p>
        <div className="format-row">
          <span className="format-chip">.zip</span>
          <span className="format-chip">.tar</span>
          <span className="format-chip">.tar.gz</span>
          <span className="format-chip">.gz</span>
        </div>
      </div>

      <p className="upload-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Analysis runs 100% client-side — no uploads, no servers, no tracking.
        Open source on{' '}
        <a href="https://github.com/nanachichan3/unvibe" target="_blank" rel="noreferrer">GitHub</a>
      </p>
    </section>
  );
}
