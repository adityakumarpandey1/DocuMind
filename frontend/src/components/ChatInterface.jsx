import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { queryDocuments } from '../utils/api';
import styles from './ChatInterface.module.css';

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function ConfidenceBar({ score, label }) {
  const pct = Math.min(100, Math.round(score));
  const color = pct >= 70 ? '#4ecdc4' : pct >= 40 ? '#f7b731' : '#ff6b6b';
  return (
    <div className={styles.confItem}>
      <span className={styles.confLabel}>{label}</span>
      <div className={styles.confBarWrap}>
        <div className={styles.confBarFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.confPct} style={{ color }}>{pct}%</span>
    </div>
  );
}

function EvalPanel({ metrics }) {
  const [open, setOpen] = useState(false);
  if (!metrics) return null;
  return (
    <div className={styles.evalPanel}>
      <button className={styles.evalToggle} onClick={() => setOpen(v => !v)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        RAG Metrics {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className={styles.evalContent}>
          <ConfidenceBar score={metrics.faithfulness} label="Faithfulness" />
          <ConfidenceBar score={metrics.contextRelevance} label="Context Relevance" />
          <ConfidenceBar score={metrics.avgRetrievalScore * 100} label="Retrieval Score" />
        </div>
      )}
    </div>
  );
}

function SourceTag({ source }) {
  const [open, setOpen] = useState(false);
  const pct = Math.min(100, Math.round(source.score * 100));
  const color = pct >= 70 ? '#4ecdc4' : pct >= 40 ? '#f7b731' : '#ff6b6b';
  return (
    <div className={styles.source}>
      <button className={styles.sourceBtn} onClick={() => setOpen(!open)}>
        <span className={styles.sourceNum}>S{source.index}</span>
        <span className={styles.sourceName}>{source.docName}</span>
        <div className={styles.sourceMiniBar}>
          <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 2 }} />
        </div>
        <span className={styles.sourceScore} style={{ color }}>{pct}%</span>
      </button>
      {open && <p className={styles.sourceExcerpt}>{source.excerpt}</p>}
    </div>
  );
}

function exportChatToPDF(messages) {
  const content = messages.map(m =>
    `[${m.role.toUpperCase()}]\n${m.content}\n${m.sources?.length ? '\nSources: ' + m.sources.map(s => s.docName).join(', ') : ''}\n`
  ).join('\n---\n\n');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>DocuMind Chat Export</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a2e; line-height: 1.6; }
  h1 { color: #7c6cff; border-bottom: 2px solid #7c6cff; padding-bottom: 8px; }
  .meta { color: #888; font-size: 13px; margin-bottom: 24px; }
  .msg { margin-bottom: 20px; padding: 14px 18px; border-radius: 8px; }
  .user { background: #f0eeff; border-left: 4px solid #7c6cff; }
  .assistant { background: #f8f8ff; border-left: 4px solid #4ecdc4; }
  .role { font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; color: #666; }
  .sources { font-size: 12px; color: #888; margin-top: 8px; }
  pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
</style>
</head>
<body>
<h1>📄 DocuMind Chat Export</h1>
<div class="meta">Exported: ${new Date().toLocaleString()} · ${messages.length} messages</div>
${messages.map(m => `
<div class="msg ${m.role}">
  <div class="role">${m.role}</div>
  <pre>${m.content}</pre>
  ${m.sources?.length ? `<div class="sources">Sources: ${m.sources.map(s => s.docName).join(', ')}</div>` : ''}
</div>`).join('')}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `documind-chat-${new Date().toISOString().slice(0,10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ChatInterface({ selectedDocs, hasDocuments }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    const userMsg = { role: 'user', content: q, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await queryDocuments(q, selectedDocs, history);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources,
        evalMetrics: res.data.evalMetrics,
        id: Date.now() + 1,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: e.response?.data?.error || 'Something went wrong. Please try again.',
        sources: [], id: Date.now() + 1, isError: true,
      }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const SUGGESTIONS = [
    'Summarize the main points of this document',
    'What are the key findings or conclusions?',
    'List all important dates or numbers mentioned',
    'What problem does this document address?',
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Chat with Documents</span>
        <div className={styles.headerMeta}>
          {selectedDocs.length > 0
            ? <span className={styles.pill}>{selectedDocs.length} doc{selectedDocs.length > 1 ? 's' : ''} selected</span>
            : <span className={styles.pillAll}>All docs</span>}
          {messages.length > 0 && (
            <>
              <button className={styles.exportBtn} onClick={() => exportChatToPDF(messages)} title="Export chat">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
              </button>
              <button className={styles.clearBtn} onClick={() => setMessages([])}>Clear</button>
            </>
          )}
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <p className={styles.emptyTitle}>Ask anything about your documents</p>
            <p className={styles.emptySub}>{hasDocuments ? 'Try one of these to get started' : 'Upload a document first'}</p>
            {hasDocuments && (
              <div className={styles.suggestions}>
                {SUGGESTIONS.map(s => (
                  <button key={s} className={styles.suggestion} onClick={() => { setInput(s); inputRef.current?.focus(); }}>{s}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`${styles.msg} ${msg.role === 'user' ? styles.user : styles.assistant} ${msg.isError ? styles.error : ''}`}>
            <div className={styles.bubble}>
              {msg.role === 'assistant'
                ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                : <p>{msg.content}</p>}
            </div>
            {msg.evalMetrics && <EvalPanel metrics={msg.evalMetrics} />}
            {msg.sources?.length > 0 && (
              <div className={styles.sources}>
                <p className={styles.sourcesLabel}>Sources</p>
                {msg.sources.map(s => <SourceTag key={s.index} source={s} />)}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className={`${styles.msg} ${styles.assistant}`}>
            <div className={styles.bubble}>
              <div className={styles.thinking}><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputRow}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={hasDocuments ? 'Ask a question about your documents...' : 'Upload a document to begin'}
          disabled={!hasDocuments || loading}
          rows={1}
        />
        <button className={styles.sendBtn} onClick={send} disabled={!input.trim() || loading || !hasDocuments}>
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
