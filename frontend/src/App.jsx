import React, { useState, useEffect } from 'react';
import DocumentUploader from './components/DocumentUploader';
import DocumentList from './components/DocumentList';
import ChatInterface from './components/ChatInterface';
import SummaryModal from './components/SummaryModal';
import CompareModal from './components/CompareModal';
import EvalPage from './components/EvalPage';
import { getDocuments } from './utils/api';
import styles from './App.module.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showEval, setShowEval] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    getDocuments().then(r => setDocuments(r.data.documents)).catch(() => {});
  }, []);

  const handleUploaded = (doc) => {
    setDocuments(prev => [...prev, {
      docId: doc.docId, name: doc.name,
      wordCount: doc.wordCount, chunkCount: doc.chunkCount,
      uploadedAt: new Date().toISOString(),
    }]);
    setSelectedDocs(prev => [...prev, doc.docId]);
  };

  const handleDeleted = (docId) => {
    setDocuments(prev => prev.filter(d => d.docId !== docId));
    setSelectedDocs(prev => prev.filter(id => id !== docId));
  };

  const handleToggleSelect = (docId) =>
    setSelectedDocs(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <span className={styles.logoText}>DocuMind</span>
          <span className={styles.logoBadge}>RAG v2</span>
        </div>
        <div className={styles.headerRight}>
          {documents.length >= 2 && (
            <button className={styles.compareBtn} onClick={() => setShowCompare(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
              </svg>
              Compare Docs
            </button>
          )}
          <button className={styles.evalBtn} onClick={() => setShowEval(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Eval Panel
          </button>
          <span className={styles.status}>
            <span className={styles.statusDot}/>
            Groq · llama-3.3-70b
          </span>
          <button className={styles.sidebarToggle} onClick={() => setSidebarOpen(v => !v)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={`${styles.sidebar} ${sidebarOpen ? '' : styles.sidebarHidden}`}>
          <div className={styles.sidebarSection}>
            <p className={styles.sectionLabel}>Upload Document</p>
            <DocumentUploader onUploaded={handleUploaded}/>
          </div>
          <div className={styles.sidebarSection}>
            <p className={styles.sectionLabel}>
              Documents
              <span className={styles.docCount}>{documents.length}</span>
            </p>
            <DocumentList
              documents={documents}
              selectedDocs={selectedDocs}
              onToggleSelect={handleToggleSelect}
              onDeleted={handleDeleted}
              onSummary={setSummaryData}
            />
          </div>
          {documents.length > 0 && (
            <div className={styles.selectActions}>
              <button className={styles.selectAll} onClick={() => setSelectedDocs(documents.map(d => d.docId))}>Select all</button>
              <button className={styles.selectNone} onClick={() => setSelectedDocs([])}>Clear</button>
            </div>
          )}
        </aside>

        <main className={styles.main}>
          <ChatInterface selectedDocs={selectedDocs} hasDocuments={documents.length > 0}/>
        </main>
      </div>

      {summaryData && <SummaryModal data={summaryData} onClose={() => setSummaryData(null)}/>}
      {showCompare && <CompareModal documents={documents} onClose={() => setShowCompare(false)}/>}
      {showEval && <EvalPage onClose={() => setShowEval(false)}/>}
    </div>
  );
}
