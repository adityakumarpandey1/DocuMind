import React, { useState } from 'react';
import { deleteDocument, summarizeDocument } from '../utils/api';
import styles from './DocumentList.module.css';

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

export default function DocumentList({ documents, selectedDocs, onToggleSelect, onDeleted, onSummary }) {
  const [deleting, setDeleting] = useState(null);
  const [summarizing, setSummarizing] = useState(null);

  const handleDelete = async (docId) => {
    setDeleting(docId);
    try {
      await deleteDocument(docId);
      onDeleted(docId);
    } catch (e) { console.error(e); }
    setDeleting(null);
  };

  const handleSummarize = async (docId, docName) => {
    setSummarizing(docId);
    try {
      const res = await summarizeDocument(docId);
      onSummary({ docName, summary: res.data.summary });
    } catch (e) { console.error(e); }
    setSummarizing(null);
  };

  if (!documents.length) {
    return (
      <div className={styles.empty}>
        <p>No documents yet. Upload one above.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {documents.map((doc) => {
        const isSelected = selectedDocs.includes(doc.docId);
        return (
          <div key={doc.docId} className={`${styles.item} ${isSelected ? styles.selected : ''}`}>
            <div className={styles.check} onClick={() => onToggleSelect(doc.docId)}>
              <div className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}>
                {isSelected && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" strokeWidth="1.5"/></svg>}
              </div>
            </div>
            <div className={styles.info} onClick={() => onToggleSelect(doc.docId)}>
              <div className={styles.nameRow}>
                <span className={styles.docIcon}><DocIcon /></span>
                <span className={styles.name}>{doc.name}</span>
              </div>
              <div className={styles.meta}>
                <span>{doc.wordCount?.toLocaleString()} words</span>
                <span>·</span>
                <span>{doc.chunkCount} chunks</span>
                <span>·</span>
                <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.summaryBtn}
                onClick={() => handleSummarize(doc.docId, doc.name)}
                disabled={summarizing === doc.docId}
                title="Summarize"
              >
                {summarizing === doc.docId ? '...' : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                )}
              </button>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(doc.docId)}
                disabled={deleting === doc.docId}
                title="Remove"
              >
                {deleting === doc.docId ? '...' : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
