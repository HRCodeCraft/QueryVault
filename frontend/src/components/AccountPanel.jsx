import { useState, useEffect } from 'react';
import { t } from '../i18n';
import { listApiKeys, createApiKey, deleteApiKey } from '../api';
import './AccountPanel.css';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
  { value: 'es', label: 'Español (Spanish)' },
  { value: 'de', label: 'Deutsch (German)' },
];

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Section({ id, active, label, icon, onClick, children }) {
  return (
    <div className="ap-section">
      <button className={`ap-section-header ${active ? 'open' : ''}`} onClick={() => onClick(id)}>
        <span className="ap-section-icon">{icon}</span>
        <span className="ap-section-label">{label}</span>
        <span className="ap-section-chevron">{active ? '▲' : '▼'}</span>
      </button>
      {active && <div className="ap-section-body">{children}</div>}
    </div>
  );
}

export default function AccountPanel({
  email, sessions, settings, profile, lang = 'en',
  onSettingsChange, onProfileChange,
  onDeleteSession, onClearSessions,
  onClose, onLogout, onDeleteAccount,
}) {
  const [openSection, setOpenSection] = useState('profile');
  const [pinInput, setPinInput]       = useState('');
  const [pinConfirm, setPinConfirm]   = useState('');
  const [pinError, setPinError]       = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [apiKeys, setApiKeys]         = useState([]);
  const [newKeyName, setNewKeyName]   = useState('');
  const [newKeySecret, setNewKeySecret] = useState('');
  const [keyLoading, setKeyLoading]   = useState(false);

  useEffect(() => {
    if (openSection === 'apikeys') {
      listApiKeys().then(r => setApiKeys(r.data)).catch(() => {});
    }
  }, [openSection]);

  async function handleCreateKey() {
    if (!newKeyName.trim()) return;
    setKeyLoading(true);
    try {
      const res = await createApiKey(newKeyName.trim());
      setNewKeySecret(res.data.key);
      setNewKeyName('');
      listApiKeys().then(r => setApiKeys(r.data)).catch(() => {});
    } finally { setKeyLoading(false); }
  }

  async function handleDeleteKey(id) {
    await deleteApiKey(id);
    setApiKeys(prev => prev.filter(k => k.id !== id));
  }

  const initials = (profile?.displayName || email || '?')[0].toUpperCase();

  function toggleSection(id) {
    setOpenSection(prev => prev === id ? '' : id);
  }

  function handleParentalToggle() {
    if (profile.parentalEnabled) {
      onProfileChange({ parentalEnabled: false, parentalPin: '' });
      setPinInput(''); setPinConfirm(''); setPinError('');
    } else {
      onProfileChange({ parentalEnabled: true });
    }
  }

  function handleSetPin() {
    if (pinInput.length !== 4) return setPinError('PIN must be exactly 4 digits.');
    if (pinInput !== pinConfirm) return setPinError('PINs do not match.');
    onProfileChange({ parentalPin: pinInput });
    setPinInput(''); setPinConfirm(''); setPinError('');
  }

  return (
    <div className="account-overlay" onClick={onClose}>
      <div className="account-panel" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="ap-header">
          <div className="ap-avatar-lg">{initials}</div>
          <div className="ap-header-info">
            <span className="ap-header-name">{profile?.displayName || 'Your Profile'}</span>
            <span className="ap-header-email">{email}</span>
            <span className="ap-plan-chip">{t('free_plan', lang)}</span>
          </div>
          <button className="ap-close" onClick={onClose}>✕</button>
        </div>

        <div className="ap-body">

          {/* ── 1. Profile ── */}
          <Section id="profile" active={openSection === 'profile'} label={t('section_profile', lang)} icon="👤" onClick={toggleSection}>
            <div className="ap-field">
              <label>{t('display_name', lang)}</label>
              <input
                type="text"
                placeholder="e.g. Harsh Raj"
                value={profile?.displayName || ''}
                onChange={e => onProfileChange({ displayName: e.target.value })}
              />
            </div>
            <div className="ap-field">
              <label>{t('username', lang)}</label>
              <input
                type="text"
                placeholder="e.g. harshraj"
                value={profile?.username || ''}
                onChange={e => onProfileChange({ username: e.target.value })}
              />
            </div>
          </Section>

          {/* ── 2. Settings ── */}
          <Section id="settings" active={openSection === 'settings'} label={t('section_settings', lang)} icon="⚙️" onClick={toggleSection}>
            {/* Theme */}
            <div className="ap-field">
              <label>{t('theme', lang)}</label>
              <div className="ap-toggle-group">
                <button
                  className={`ap-toggle-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => onSettingsChange({ theme: 'dark' })}
                >{t('dark', lang)}</button>
                <button
                  className={`ap-toggle-btn ${settings.theme === 'light' ? 'active' : ''}`}
                  onClick={() => onSettingsChange({ theme: 'light' })}
                >{t('light', lang)}</button>
              </div>
            </div>

            {/* Language */}
            <div className="ap-field">
              <label>{t('language', lang)}</label>
              <select
                value={settings.language}
                onChange={e => onSettingsChange({ language: e.target.value })}
              >
                {LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Contrast */}
            <div className="ap-field">
              <label>{t('contrast', lang)}</label>
              <div className="ap-toggle-group">
                <button
                  className={`ap-toggle-btn ${settings.contrast === 'default' ? 'active' : ''}`}
                  onClick={() => onSettingsChange({ contrast: 'default' })}
                >{t('default', lang)}</button>
                <button
                  className={`ap-toggle-btn ${settings.contrast === 'high' ? 'active' : ''}`}
                  onClick={() => onSettingsChange({ contrast: 'high' })}
                >{t('high', lang)}</button>
              </div>
            </div>
          </Section>

          {/* ── 3. Account ── */}
          <Section id="account" active={openSection === 'account'} label={t('section_account', lang)} icon="🔐" onClick={toggleSection}>
            <div className="ap-field">
              <label>{t('full_name', lang)}</label>
              <input
                type="text"
                placeholder="Your full name"
                value={profile?.displayName || ''}
                onChange={e => onProfileChange({ displayName: e.target.value })}
              />
            </div>
            <div className="ap-field">
              <label>{t('email', lang)}</label>
              <input type="email" value={email} readOnly className="ap-readonly" />
            </div>
            <div className="ap-field">
              <label>LinkedIn</label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/yourname"
                value={profile?.linkedIn || ''}
                onChange={e => onProfileChange({ linkedIn: e.target.value })}
              />
            </div>
            <div className="ap-field">
              <label>GitHub</label>
              <input
                type="url"
                placeholder="https://github.com/yourname"
                value={profile?.github || ''}
                onChange={e => onProfileChange({ github: e.target.value })}
              />
            </div>
            {profile?.linkedIn && (
              <div className="ap-social-links">
                <a href={profile.linkedIn} target="_blank" rel="noreferrer" className="ap-social-link linkedin">
                  in LinkedIn
                </a>
                {profile?.github && (
                  <a href={profile.github} target="_blank" rel="noreferrer" className="ap-social-link github">
                    ⌥ GitHub
                  </a>
                )}
              </div>
            )}

            {/* Chat history in account section */}
            <div className="ap-history-header">
              <span>{t('chat_history', lang)} ({sessions.length})</span>
              {sessions.length > 0 && (
                <button className="ap-clear-btn" onClick={onClearSessions}>{t('clear_all', lang)}</button>
              )}
            </div>
            <div className="ap-sessions">
              {sessions.length === 0
                ? <p className="ap-empty">{t('no_history', lang)}</p>
                : sessions.slice().reverse().map(s => (
                  <div key={s.id} className="ap-session">
                    <div className="ap-session-info">
                      <span className="ap-session-title">{s.title}</span>
                      <span className="ap-session-meta">{s.docName} · {timeAgo(s.ts)}</span>
                    </div>
                    <button className="ap-session-del" onClick={() => onDeleteSession(s.id)}>✕</button>
                  </div>
                ))
              }
            </div>

            {/* Delete account */}
            <div className="ap-danger-zone">
              {!showDeleteConfirm ? (
                <button className="ap-danger-btn" onClick={() => setShowDeleteConfirm(true)}>
                  {t('delete_account', lang)}
                </button>
              ) : (
                <div className="ap-confirm-delete">
                  <p>{t('confirm_delete', lang)}</p>
                  <div className="ap-confirm-actions">
                    <button className="ap-confirm-yes" onClick={onDeleteAccount}>{t('yes_delete', lang)}</button>
                    <button className="ap-confirm-no"  onClick={() => setShowDeleteConfirm(false)}>{t('cancel', lang)}</button>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ── 4. Parental Control ── */}
          <Section id="parental" active={openSection === 'parental'} label={t('section_parental', lang)} icon="🛡️" onClick={toggleSection}>
            <div className="ap-field ap-row">
              <div>
                <span className="ap-field-title">{t('parental_title', lang)}</span>
                <span className="ap-field-sub">{t('parental_sub', lang)}</span>
              </div>
              <button
                className={`ap-switch ${profile?.parentalEnabled ? 'on' : ''}`}
                onClick={handleParentalToggle}
              >
                <span className="ap-switch-thumb" />
              </button>
            </div>

            {profile?.parentalEnabled && (
              <>
                <div className="ap-field">
                  <label>{t('set_pin', lang)}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={pinInput}
                    onChange={e => { setPinInput(e.target.value.replace(/\D/g,'')); setPinError(''); }}
                  />
                </div>
                <div className="ap-field">
                  <label>{t('confirm_pin', lang)}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={pinConfirm}
                    onChange={e => { setPinConfirm(e.target.value.replace(/\D/g,'')); setPinError(''); }}
                  />
                </div>
                {pinError && <p className="ap-pin-error">{pinError}</p>}
                <button className="ap-save-pin" onClick={handleSetPin}>
                  {profile?.parentalPin ? t('update_pin', lang) : t('save_pin', lang)}
                </button>
                {profile?.parentalPin && (
                  <p className="ap-pin-status">{t('pin_active', lang)}</p>
                )}
              </>
            )}
          </Section>

          {/* ── 5. API Keys ── */}
          <Section id="apikeys" active={openSection === 'apikeys'} label="API Access" icon="🔑" onClick={toggleSection}>
            <p className="ap-api-desc">
              Use API keys to access QueryVault from your own apps or scripts.
            </p>

            {/* Create new key */}
            <div className="ap-field">
              <label>Key Name</label>
              <div className="ap-key-create-row">
                <input
                  type="text"
                  placeholder="e.g. My App"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateKey()}
                />
                <button className="ap-key-gen-btn" onClick={handleCreateKey} disabled={keyLoading || !newKeyName.trim()}>
                  {keyLoading ? '…' : '+ Generate'}
                </button>
              </div>
            </div>

            {/* Show newly created key once */}
            {newKeySecret && (
              <div className="ap-new-key-box">
                <span className="ap-new-key-label">⚠ Copy now — shown only once</span>
                <code className="ap-new-key-value">{newKeySecret}</code>
                <button className="ap-copy-btn" onClick={() => { navigator.clipboard.writeText(newKeySecret); }}>
                  Copy
                </button>
                <button className="ap-dismiss-btn" onClick={() => setNewKeySecret('')}>Dismiss</button>
              </div>
            )}

            {/* Existing keys */}
            <div className="ap-key-list">
              {apiKeys.length === 0
                ? <p className="ap-empty">No API keys yet.</p>
                : apiKeys.map(k => (
                  <div key={k.id} className="ap-key-row">
                    <div className="ap-key-info">
                      <span className="ap-key-name">{k.name}</span>
                      <code className="ap-key-prefix">{k.key_prefix}••••••••</code>
                      <span className="ap-key-meta">
                        Created {new Date(k.created_at).toLocaleDateString()}
                        {k.last_used ? ` · Last used ${new Date(k.last_used).toLocaleDateString()}` : ' · Never used'}
                      </span>
                    </div>
                    <button className="ap-key-del" onClick={() => handleDeleteKey(k.id)}>✕</button>
                  </div>
                ))
              }
            </div>

            <div className="ap-api-usage">
              <p className="ap-api-usage-title">How to use:</p>
              <code className="ap-api-code">{`curl -H "X-API-Key: qv_..." http://localhost:8000/api/chat/`}</code>
            </div>
          </Section>

        </div>

        {/* ── Footer ── */}
        <div className="ap-footer">
          <button className="ap-logout-btn" onClick={onLogout}>
            {t('sign_out', lang)}
          </button>
        </div>

      </div>
    </div>
  );
}
