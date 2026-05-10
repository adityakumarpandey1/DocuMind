import React, { useState, useEffect } from 'react';
import { getEvalLog } from '../utils/api';
import styles from './EvalPage.module.css';

function MetricRing({ value, label, color }) {
  const r = 30; const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className={styles.ring}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--surface3)" strokeWidth="6"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 40 40)" style={{ transition: 'stroke-dasharray 0.6s ease' }}/>
        <text x="40" y="44" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold" fontFamily="DM Mono">{value}%</text>
      </svg>
      <p className={styles.ringLabel}>{label}</p>
    </div>
  );
}

export default function EvalPage({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvalLog().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <p className={styles.title}>RAG Evaluation Panel</p>
            <p className={styles.sub}>Retrieval quality metrics across all queries</p>
          </div>
          <button className={styles.close} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}><div className={styles.spinner}/></div>
        ) : !data || data.totalQueries === 0 ? (
          <div className={styles.empty}>
            <p>No queries yet. Ask some questions first to see evaluation metrics.</p>
          </div>
        ) : (
          <div className={styles.content}>
            {data.averages && (
              <div className={styles.summary}>
                <p className={styles.sectionLabel}>Average Metrics ({data.totalQueries} queries)</p>
                <div className={styles.rings}>
                  <MetricRing value={data.averages.faithfulness} label="Faithfulness" color="#7c6cff"/>
                  <MetricRing value={data.averages.contextRelevance} label="Context Relevance" color="#4ecdc4"/>
                </div>
                <div className={styles.explainer}>
                  <div className={styles.explainItem}>
                    <span className={styles.dot} style={{background:'#7c6cff'}}/>
                    <span><strong>Faithfulness</strong> — how much of the answer comes from retrieved chunks (lexical overlap)</span>
                  </div>
                  <div className={styles.explainItem}>
                    <span className={styles.dot} style={{background:'#4ecdc4'}}/>
                    <span><strong>Context Relevance</strong> — how well retrieved chunks matched the query (cosine similarity)</span>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.log}>
              <p className={styles.sectionLabel}>Query Log</p>
              {data.log.map((entry, i) => (
                <div key={entry.id} className={styles.entry}>
                  <div className={styles.entryHeader}>
                    <span className={styles.entryNum}>#{data.log.length - i}</span>
                    <span className={styles.entryQ}>{entry.question}</span>
                    <span className={styles.entryTime}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className={styles.entryMeta}>
                    <span className={styles.badge}>{entry.chunksRetrieved} chunks</span>
                    <span className={styles.badge}>{entry.docsQueried} docs</span>
                    <span className={styles.badge} style={{color:'#7c6cff'}}>faith {entry.evalMetrics.faithfulness}%</span>
                    <span className={styles.badge} style={{color:'#4ecdc4'}}>rel {entry.evalMetrics.contextRelevance}%</span>
                  </div>
                  <div className={styles.entryChunks}>
                    {entry.sources.map((s, j) => (
                      <div key={j} className={styles.chunkRow}>
                        <div className={styles.chunkBar}>
                          <div style={{
                            width: `${Math.min(100, Math.round(s.score * 100))}%`,
                            background: s.score > 0.7 ? '#4ecdc4' : s.score > 0.4 ? '#f7b731' : '#ff6b6b',
                            height: '100%', borderRadius: 2,
                          }}/>
                        </div>
                        <span className={styles.chunkDoc}>{s.docName}</span>
                        <span className={styles.chunkExcerpt}>{s.excerpt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
