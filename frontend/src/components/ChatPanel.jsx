import { useState, useEffect, useRef } from 'react';
import { askQuestion, compareDocuments, listProviders } from '../api';
import { t } from '../i18n';
import './ChatPanel.css';

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

async function exportChatPDF(messages, docName, providerName) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxW = pageW - margin * 2;
  let y = 20;

  const checkPage = (need = 10) => {
    if (y + need > 280) { doc.addPage(); y = 20; }
  };

  // Title
  doc.setFontSize(18);
  doc.setTextColor(108, 99, 255);
  doc.text('QueryVault — Chat Report', margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(130, 130, 150);
  doc.text(`Document: ${docName || 'All documents'}  |  Model: ${providerName}  |  ${new Date().toLocaleString()}`, margin, y);
  y += 8;

  doc.setDrawColor(200, 200, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  for (const msg of messages) {
    if (msg.isError) continue;
    checkPage(14);

    // Role label
    doc.setFontSize(8);
    doc.setTextColor(msg.role === 'user' ? 80 : 108, msg.role === 'user' ? 80 : 99, msg.role === 'user' ? 80 : 255);
    doc.setFont(undefined, 'bold');
    doc.text(msg.role === 'user' ? 'You' : 'QueryVault AI', margin, y);
    y += 5;

    // Message body
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(msg.content, maxW);
    lines.forEach(line => { checkPage(6); doc.text(line, margin, y); y += 5.5; });

    // Sources
    if (msg.sources?.length) {
      y += 2;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 120);
      doc.setFont(undefined, 'italic');
      msg.sources.forEach(src => {
        checkPage(5);
        const srcText = `  Source: ${src.source}${src.page != null ? ` (p.${src.page + 1})` : ''} — ${src.content?.slice(0, 120)}…`;
        doc.splitTextToSize(srcText, maxW).forEach(l => { checkPage(5); doc.text(l, margin + 3, y); y += 4.5; });
      });
      doc.setFont(undefined, 'normal');
    }
    y += 4;
  }

  doc.save(`QueryVault-Report-${Date.now()}.pdf`);
}

const PROVIDERS = [
  { id: 'groq',   name: 'Groq (Llama 3.1)',  icon: '⚡' },
  { id: 'gemini', name: 'Google Gemini',       icon: '✦' },
  { id: 'openai', name: 'OpenAI GPT-4o Mini',  icon: '◎' },
  { id: 'claude', name: 'Anthropic Claude',    icon: '◈' },
];

export default function ChatPanel({ documents, selectedDoc, setSelectedDoc, onSaveSession, lang = 'en' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [availableIds, setAvailableIds] = useState([]);
  const [expandedSources, setExpandedSources] = useState({});
  const [compareMode, setCompareMode] = useState(false);
  const [compareDocB, setCompareDocB] = useState('');
  const sessionIdRef = useRef(genId());
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    listProviders()
      .then(res => {
        const available = res.data.filter(p => p.available).map(p => p.id);
        setAvailableIds(available);
        if (available.includes('groq')) setSelectedProvider('groq');
        else if (available.length > 0) setSelectedProvider(available[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    const nextMessages = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = compareMode && selectedDoc && compareDocB
        ? await compareDocuments(question, selectedDoc, compareDocB, selectedProvider)
        : await askQuestion(question, selectedProvider, selectedDoc || null);
      const aiMsg = { role: 'assistant', content: res.data.answer, sources: res.data.sources, provider: selectedProvider, isCompare: compareMode };
      const finalMessages = [...nextMessages, aiMsg];
      setMessages(finalMessages);

      // Save session to history
      const activeDoc = documents.find(d => d.id === selectedDoc);
      onSaveSession?.({
        id: sessionIdRef.current,
        title: question.length > 55 ? question.slice(0, 55) + '…' : question,
        messages: finalMessages,
        docId: selectedDoc || '',
        docName: activeDoc?.name || 'All documents',
        ts: Date.now(),
      });
    } catch (e) {
      const detail = e.response?.data?.detail || 'Something went wrong. Please try again.';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: detail, isError: true },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function toggleSources(idx) {
    setExpandedSources(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  const activeDoc = documents.find(d => d.id === selectedDoc);
  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <main className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <h1 className="chat-title">QueryVault</h1>
          {activeDoc && (
            <span className="active-doc-badge">
              &#128196; {activeDoc.name}
              <button onClick={() => setSelectedDoc('')} className="clear-doc">&#10005;</button>
            </span>
          )}
        </div>

          {/* Compare toggle */}
        {documents.length >= 2 && (
          <button
            className={`compare-btn ${compareMode ? 'active' : ''}`}
            onClick={() => { setCompareMode(m => !m); setCompareDocB(''); }}
            title="Compare two documents"
          >⇄ Compare</button>
        )}

        {/* Export button */}
        {messages.length > 0 && (
          <button
            className="export-btn"
            title="Export chat as PDF"
            onClick={() => exportChatPDF(messages, activeDoc?.name || 'All documents', currentProvider?.name)}
          >↓ PDF</button>
        )}

        {/* Provider Dropdown */}
        <div className="provider-dropdown-wrapper">
          <span className="provider-dropdown-icon">{currentProvider?.icon}</span>
          <select
            className="provider-dropdown"
            value={selectedProvider}
            onChange={e => setSelectedProvider(e.target.value)}
          >
            {PROVIDERS.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{!availableIds.includes(p.id) ? ' (not configured)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Compare bar */}
      {compareMode && (
        <div className="compare-bar">
          <span className="compare-label">⇄ Compare Mode</span>
          <select
            className="compare-doc-select"
            value={selectedDoc}
            onChange={e => setSelectedDoc(e.target.value)}
          >
            <option value="">Select Doc A…</option>
            {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <span className="compare-vs">vs</span>
          <select
            className="compare-doc-select"
            value={compareDocB}
            onChange={e => setCompareDocB(e.target.value)}
          >
            <option value="">Select Doc B…</option>
            {documents.filter(d => d.id !== selectedDoc).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="welcome-icon">&#128172;</div>
            <h2>{t('welcome_h', lang)}</h2>
            <p>{t('welcome_p', lang)}</p>
            <div className="welcome-examples">
              <span>{t('try1', lang)}</span>
              <span>{t('try2', lang)}</span>
              <span>{t('try3', lang)}</span>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.role} ${msg.isError ? 'message-error' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="msg-avatar">
                {msg.isError ? '!' : (PROVIDERS.find(p => p.id === msg.provider)?.icon || '◎')}
              </div>
            )}
            <div className="message-bubble">
              <p className="message-text">{msg.content}</p>

              {msg.sources?.length > 0 && (
                <div className="sources-section">
                  <button className="sources-toggle" onClick={() => toggleSources(idx)}>
                    {expandedSources[idx] ? '▲' : '▼'} {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                  </button>
                  {expandedSources[idx] && (
                    <div className="sources-list">
                      {msg.sources.map((src, si) => (
                        <div key={si} className="source-item">
                          <div className="source-meta">
                            <span className="source-file">&#128196; {src.source}</span>
                            {src.page != null && <span className="source-page">p.{src.page + 1}</span>}
                          </div>
                          <p className="source-content">{src.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message message-assistant">
            <div className="msg-avatar">{currentProvider?.icon || '◎'}</div>
            <div className="message-bubble typing-bubble">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-area" onSubmit={handleSend}>
        <div className="input-wrapper">
          <input
            ref={inputRef}
            className="chat-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={documents.length === 0 ? t('placeholder_nodoc', lang) : t('placeholder_doc', lang)}
            disabled={loading || documents.length === 0}
            autoFocus
          />
          <button
            className="btn-send"
            type="submit"
            disabled={loading || !input.trim() || documents.length === 0}
          >
            &#9658;
          </button>
        </div>
        <p className="input-hint">
          {currentProvider?.icon} {currentProvider?.name} &middot;
          {activeDoc ? ` ${activeDoc.name}` : ' All documents'}
        </p>
      </form>
    </main>
  );
}
