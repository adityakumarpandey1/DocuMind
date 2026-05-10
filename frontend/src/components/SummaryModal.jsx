import React from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './SummaryModal.module.css';

export default function SummaryModal({ data, onClose }) {
  if (!data) return null;
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <p className={styles.label}>Document Summary</p>
            <p className={styles.name}>{data.docName}</p>
          </div>
          <button className={styles.close} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className={styles.content}>
          <ReactMarkdown>{data.summary}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
