'use client';

import { useState, useCallback } from 'react';
import { Upload, FileArchive, AlertCircle } from 'lucide-react';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '../lib/types';
import { parseArchive, calculateMetrics, generateStaticQuestions } from '../lib/parser';

interface UploadZoneProps {
  onDataLoaded: (files: FileInfo[], metrics: ComplexityMetrics, questions: GameQuestion[]) => void;
}

export default function UploadZone({ onDataLoaded }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const files = await parseArchive(file);
      if (files.length === 0) {
        setError('No files found in archive. Make sure you\'re uploading a valid zip file.');
        setLoading(false);
        return;
      }

      const metrics = calculateMetrics(files);
      const questions = generateStaticQuestions(files, metrics);
      onDataLoaded(files, metrics, questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse archive');
      setLoading(false);
    }
  }, [onDataLoaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <section id="start" style={{
      padding: '80px 0',
      background: 'radial-gradient(ellipse at 50% 100%, rgba(0, 240, 255, 0.08) 0%, transparent 60%)',
    }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '16px',
          }}>
            Start Here
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>
            Drop your code archive to begin
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragging ? '#00f0ff' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: '24px',
            padding: '80px 40px',
            textAlign: 'center',
            background: dragging ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255,255,255,0.02)',
            transition: 'all 0.3s ease',
            cursor: loading ? 'wait' : 'pointer',
            maxWidth: '700px',
            margin: '0 auto',
          }}
        >
          {loading ? (
            <div>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(0, 240, 255, 0.2)',
                borderTopColor: '#00f0ff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 24px',
              }} />
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>Analyzing your codebase...</p>
            </div>
          ) : (
            <>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <Upload size={32} color="#00f0ff" />
              </div>
              <h3 style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '24px',
                fontWeight: 600,
                marginBottom: '12px',
              }}>
                Drop your archive here
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
                Drag & drop your project zip file
              </p>
              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '24px',
              }}>
                {['.zip', '.tar', '.gz'].map(ext => (
                  <span key={ext} style={{
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.6)',
                  }}>
                    {ext}
                  </span>
                ))}
              </div>
              <label style={{ cursor: 'pointer' }}>
                <span className="btn-primary" style={{ display: 'inline-block' }}>
                  Browse Files
                </span>
                <input
                  type="file"
                  accept=".zip,.tar,.gz,.tar.gz"
                  onChange={onChange}
                  style={{ display: 'none' }}
                />
              </label>
            </>
          )}
        </div>

        {error && (
          <div style={{
            maxWidth: '700px',
            margin: '24px auto 0',
            padding: '16px 24px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}>
            <AlertCircle size={20} color="#ef4444" />
            <p style={{ color: '#ef4444', fontSize: '14px' }}>{error}</p>
          </div>
        )}

        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.4)',
        }}>
          <FileArchive size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Your data never leaves this browser — analysis runs 100% client-side.
          Open source on <a href="https://github.com/yevgeniusr/unvibe" target="_blank" rel="noopener" style={{ color: '#00f0ff' }}>GitHub</a>
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
