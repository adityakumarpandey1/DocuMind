import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { compareDocuments } from '../utils/api';
import styles from './CompareModal.module.css';

export default function CompareModal({ documents, onClose }) {
  const [topic, setTopic] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const run = async () => {
    if (!topic.trim()) return setError('Enter a topic to compare.');
    if (selectedIds.length < 2) return setError('Select at least 2 documents.');
    setError(''); setLoading(true); setResult(null);
    try {
      const res = await compareDocuments(topic, selectedIds);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Comparison failed.');
    }
    setLoading(false);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <p className={styles.label}>Document Comparison</p>
            <p className={styles.sub}>Compare how documents differ on any topic</p>
          </div>
          <button className={styles.close} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {!result ? (
          <div className={styles.setup}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Topic to compare</label>
              <input
                className={styles.input}
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. risk factors, methodology, conclusions..."
                onKeyDown={e => e.key === 'Enter' && run()}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Select documents (min 2)</label>
              <div className={styles.docList}>
                {documents.map(doc => (
                  <div
                    key={doc.docId}
                    className={`${styles.docItem} ${selectedIds.includes(doc.docId) ? styles.selected : ''}`}
                    onClick={() => toggle(doc.docId)}
                  >
                    <div className={`${styles.checkbox} ${selectedIds.includes(doc.docId) ? styles.checked : ''}`}>
                      {selectedIds.includes(doc.docId) && (
                        <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" strokeWidth="1.5"/></svg>
                      )}
                    </div>
                    <span className={styles.docName}>{doc.name}</span>
                    <span className={styles.docMeta}>{doc.wordCount?.toLocaleString()}w</span>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.runBtn} onClick={run} disabled={loading}>
              {loading ? (
                <><div className={styles.spinner} /> Comparing...</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                  <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                </svg> Run Comparison</>
              )}
            </button>
          </div>
        ) : (
          <div className={styles.result}>
            <div className={styles.resultHeader}>
              <div className={styles.topicTag}>Topic: {result.topic}</div>
              <div className={styles.docTags}>
                {result.docs.map((d, i) => <span key={i} className={styles.docTag}>Doc {i+1}: {d}</span>)}
              </div>
            </div>
            <div className={styles.resultContent}>
              <ReactMarkdown>{result.comparison}</ReactMarkdown>
            </div>
            <button className={styles.resetBtn} onClick={() => setResult(null)}>← New Comparison</button>
          </div>
        )}
      </div>
    </div>
  );
}
