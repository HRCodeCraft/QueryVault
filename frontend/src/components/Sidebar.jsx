import { useState, useEffect, useRef } from 'react';
import { uploadDocument, listDocuments, deleteDocument } from '../api';
import { t } from '../i18n';
import './Sidebar.css';

export default function Sidebar({ documents, setDocuments, selectedDoc, setSelectedDoc, onOpenAccount, onOpenTeams, onToast, userEmail, profile, lang = 'en' }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    listDocuments()
      .then(res => setDocuments(res.data))
      .catch(() => {});
  }, []);

  const ALLOWED = ['.pdf', '.txt', '.docx', '.png', '.jpg', '.jpeg', '.tiff', '.bmp'];

  async function handleFile(file) {
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED.includes(ext)) {
      onToast?.(`"${file.name}" is not a valid file. Please upload PDF, TXT, DOCX, PNG, or JPG only.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadDocument(file, setProgress);
      setDocuments(prev => [...prev, res.data]);
    } catch (e) {
      onToast?.(e.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(e, docId) {
    e.stopPropagation();
    try {
      await deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (selectedDoc === docId) setSelectedDoc('');
    } catch {
      onToast?.('Delete failed. Please try again.');
    }
  }

  const displayName = profile?.displayName || userEmail || '';
  const initials = displayName ? displayName[0].toUpperCase() : '?';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <span className="brand-icon">&#128196;</span>
        <span className="brand-name">QueryVault</span>
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.tiff,.bmp"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        {uploading ? (
          <div className="upload-progress">
            <div className="spinner" />
            <span>{progress}%</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <>
            <div className="upload-icon">&#8679;</div>
            <p className="upload-text">{t('upload_doc', lang)}</p>
            <p className="upload-hint">{t('upload_hint', lang)}</p>
          </>
        )}
      </div>

      {/* Doc list */}
      <div className="doc-section">
        <p className="doc-section-title">
          {t('documents', lang)}
          <span className="badge">{documents.length}</span>
        </p>

        {documents.length === 0 ? (
          <p className="doc-empty">{t('no_docs', lang)}</p>
        ) : (
          <div className="doc-list">
            <div
              className={`doc-item ${selectedDoc === '' ? 'active' : ''}`}
              onClick={() => setSelectedDoc('')}
            >
              <span className="doc-item-icon">&#128218;</span>
              <span className="doc-item-name">{t('all_docs', lang)}</span>
            </div>
            {documents.map(doc => (
              <div
                key={doc.id}
                className={`doc-item ${selectedDoc === doc.id ? 'active' : ''}`}
                onClick={() => setSelectedDoc(doc.id)}
              >
                <span className="doc-item-icon">&#128196;</span>
                <span className="doc-item-name">{doc.name}</span>
                <button
                  className="doc-delete"
                  onClick={e => handleDelete(e, doc.id)}
                  title="Delete"
                >&#10005;</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teams button */}
      <button className="sidebar-teams-btn" onClick={onOpenTeams}>
        <span className="sidebar-teams-icon">👥</span>
        <span className="sidebar-teams-label">Team Vaults</span>
      </button>

      {/* Account footer */}
      <button className="sidebar-account-btn" onClick={onOpenAccount} title="Account & settings">
        <div className="sidebar-avatar-wrap">
          <div className="sidebar-avatar">{initials}</div>
          <span className="sidebar-plan-badge">Free</span>
        </div>
        <div className="sidebar-account-info">
          <span className="sidebar-account-email">{profile?.displayName || userEmail || 'Account'}</span>
          <span className="sidebar-account-hint">{t('profile_hint', lang)}</span>
        </div>
        <span className="sidebar-account-arrow">›</span>
      </button>
    </aside>
  );
}
