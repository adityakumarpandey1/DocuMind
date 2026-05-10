import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDocument } from '../utils/api';
import styles from './DocumentUploader.module.css';

export default function DocumentUploader({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return;
    setError('');
    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadDocument(accepted[0], setProgress);
      onUploaded(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/markdown': ['.md'],
    },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className={styles.wrapper}>
      <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''} ${uploading ? styles.uploading : ''}`}>
        <input {...getInputProps()} />
        <div className={styles.icon}>
          {uploading ? (
            <div className={styles.spinner} />
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          )}
        </div>
        {uploading ? (
          <div className={styles.uploadStatus}>
            <p className={styles.label}>Processing document...</p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.pct}>{progress}%</span>
          </div>
        ) : (
          <>
            <p className={styles.label}>
              {isDragActive ? 'Drop it here' : 'Drop a document or click to browse'}
            </p>
            <p className={styles.sub}>PDF · DOCX · TXT · MD &mdash; up to 20MB</p>
          </>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
