import { useState, useEffect, useCallback } from 'react';
import { isLoggedIn, removeToken, verifyEmail, getUserEmail } from './auth';
import {
  getProfile, updateProfile,
  getSettings, updateSettings,
  getSessions, upsertSession, deleteSession, clearSessions,
} from './api';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import AccountPanel from './components/AccountPanel';
import TeamVault from './components/TeamVault';
import Toast from './components/Toast';
import './App.css';

const DEFAULT_SETTINGS = { theme: 'dark', language: 'en', contrast: 'default' };
const DEFAULT_PROFILE  = { displayName: '', username: '', linkedIn: '', github: '', parentalEnabled: false, parentalPin: '' };

// Map backend snake_case → frontend camelCase
function toFrontendProfile(p) {
  return {
    displayName:     p.display_name     ?? '',
    username:        p.username         ?? '',
    linkedIn:        p.linkedin         ?? '',
    github:          p.github           ?? '',
    parentalEnabled: p.parental_enabled ?? false,
    parentalPin:     p.parental_pin     ?? '',
  };
}
function toBackendProfile(p) {
  return {
    display_name:     p.displayName,
    username:         p.username,
    linkedin:         p.linkedIn,
    github:           p.github,
    parental_enabled: p.parentalEnabled,
    parental_pin:     p.parentalPin,
  };
}

export default function App() {
  const [loggedIn,    setLoggedIn]    = useState(isLoggedIn());
  const [documents,   setDocuments]   = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [verifyMsg,   setVerifyMsg]   = useState('');
  const [showAccount, setShowAccount] = useState(false);
  const [showTeams,   setShowTeams]   = useState(false);
  const [toast,       setToast]       = useState(null); // { message, type }

  function showToast(message, type = 'error') {
    setToast({ message, type });
  }
  const [sessions,    setSessions]    = useState([]);
  const [settings,    setSettings]    = useState(DEFAULT_SETTINGS);
  const [profile,     setProfile]     = useState(DEFAULT_PROFILE);

  // Apply theme + contrast to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme',    settings.theme);
    document.documentElement.setAttribute('data-contrast', settings.contrast);
  }, [settings.theme, settings.contrast]);

  // Load user data from backend after login
  const loadUserData = useCallback(async () => {
    try {
      const [profRes, settRes, sessRes] = await Promise.all([
        getProfile(), getSettings(), getSessions(),
      ]);
      setProfile(toFrontendProfile(profRes.data));
      setSettings({ ...DEFAULT_SETTINGS, ...settRes.data });
      setSessions(sessRes.data);
    } catch { /* stay with defaults */ }
  }, []);

  useEffect(() => {
    if (loggedIn) loadUserData();
  }, [loggedIn]);

  // Auto-logout when API returns 401 (expired token)
  useEffect(() => {
    const handler = () => handleLogout();
    window.addEventListener('qv:logout', handler);
    return () => window.removeEventListener('qv:logout', handler);
  }, []);

  // Handle email verification link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      verifyEmail(token)
        .then(() => { setVerifyMsg('Email verified! You can now log in.'); window.history.replaceState({}, '', '/'); })
        .catch(() => { setVerifyMsg('Invalid or expired verification link.');  window.history.replaceState({}, '', '/'); });
    }
  }, []);

  function handleLogin() { setLoggedIn(true); }

  function handleLogout() {
    removeToken();
    setLoggedIn(false);
    setDocuments([]); setSelectedDoc(''); setShowAccount(false);
    setSessions([]); setSettings(DEFAULT_SETTINGS); setProfile(DEFAULT_PROFILE);
  }

  async function handleSettingsChange(patch) {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { await updateSettings(patch); } catch { /* silent */ }
  }

  async function handleProfileChange(patch) {
    const next = { ...profile, ...patch };
    setProfile(next);
    try { await updateProfile(toBackendProfile(next)); } catch { /* silent */ }
  }

  async function handleSaveSession(session) {
    setSessions(prev => {
      const exists = prev.find(s => s.id === session.id);
      return exists ? prev.map(s => s.id === session.id ? session : s) : [...prev, session];
    });
    try { await upsertSession(session); } catch { /* silent */ }
  }

  async function handleDeleteSession(id) {
    setSessions(prev => prev.filter(s => s.id !== id));
    try { await deleteSession(id); } catch { /* silent */ }
  }

  async function handleClearSessions() {
    setSessions([]);
    try { await clearSessions(); } catch { /* silent */ }
  }

  if (!loggedIn) {
    return (
      <>
        {verifyMsg && (
          <div className={`verify-banner ${verifyMsg.includes('verified') ? 'success' : 'error'}`}>
            {verifyMsg}
          </div>
        )}
        <AuthPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div className="app-layout">
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}

      {showTeams && (
        <TeamVault documents={documents} onClose={() => setShowTeams(false)} />
      )}

      {showAccount && (
        <AccountPanel
          email={getUserEmail()}
          sessions={sessions}
          settings={settings}
          profile={profile}
          lang={settings.language}
          onSettingsChange={handleSettingsChange}
          onProfileChange={handleProfileChange}
          onDeleteSession={handleDeleteSession}
          onClearSessions={handleClearSessions}
          onClose={() => setShowAccount(false)}
          onLogout={handleLogout}
          onDeleteAccount={handleLogout}
        />
      )}

      <Sidebar
        documents={documents}
        setDocuments={setDocuments}
        selectedDoc={selectedDoc}
        setSelectedDoc={setSelectedDoc}
        onOpenAccount={() => setShowAccount(true)}
        onOpenTeams={() => setShowTeams(true)}
        onToast={showToast}
        userEmail={getUserEmail()}
        profile={profile}
        lang={settings.language}
      />
      <ChatPanel
        documents={documents}
        selectedDoc={selectedDoc}
        setSelectedDoc={setSelectedDoc}
        onSaveSession={handleSaveSession}
        lang={settings.language}
      />
    </div>
  );
}
