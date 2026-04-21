import { useState, useEffect } from 'react';
import { listTeams, createTeam, joinTeam, deleteOrLeave, listTeamMembers, listTeamDocs, addTeamDoc, removeTeamDoc } from '../api';
import './TeamVault.css';

export default function TeamVault({ documents, onClose }) {
  const [teams, setTeams]           = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [members, setMembers]       = useState([]);
  const [teamDocs, setTeamDocs]     = useState([]);
  const [newName, setNewName]       = useState('');
  const [joinCode, setJoinCode]     = useState('');
  const [tab, setTab]               = useState('docs'); // 'docs' | 'members'
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState('');

  useEffect(() => { fetchTeams(); }, []);

  useEffect(() => {
    if (!activeTeam) return;
    fetchTeamDocs();
    fetchTeamMembers();
  }, [activeTeam]);

  async function fetchTeams() {
    try { const r = await listTeams(); setTeams(r.data); }
    catch { /* silent */ }
  }

  async function fetchTeamDocs() {
    try { const r = await listTeamDocs(activeTeam.id); setTeamDocs(r.data); }
    catch { /* silent */ }
  }

  async function fetchTeamMembers() {
    try { const r = await listTeamMembers(activeTeam.id); setMembers(r.data); }
    catch { /* silent */ }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const r = await createTeam(newName.trim());
      setNewName('');
      await fetchTeams();
      setActiveTeam(r.data);
      setMsg('Team created!');
    } catch(e) { setMsg(e.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setLoading(true);
    try {
      const r = await joinTeam(joinCode.trim());
      setJoinCode('');
      await fetchTeams();
      setActiveTeam(r.data);
      setMsg('Joined team!');
    } catch(e) { setMsg(e.response?.data?.detail || 'Invalid code'); }
    finally { setLoading(false); }
  }

  async function handleLeave(team) {
    if (!window.confirm(`${team.role === 'owner' ? 'Delete' : 'Leave'} team "${team.name}"?`)) return;
    await deleteOrLeave(team.id);
    setActiveTeam(null);
    setTeams(prev => prev.filter(t => t.id !== team.id));
  }

  async function handleAddDoc(doc) {
    try {
      await addTeamDoc(activeTeam.id, doc.id, doc.name);
      await fetchTeamDocs();
    } catch(e) { setMsg(e.response?.data?.detail || 'Failed to add'); }
  }

  async function handleRemoveDoc(docId) {
    await removeTeamDoc(activeTeam.id, docId);
    setTeamDocs(prev => prev.filter(d => d.id !== docId));
  }

  return (
    <div className="tv-overlay" onClick={onClose}>
      <div className="tv-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="tv-header">
          <div className="tv-header-left">
            {activeTeam && (
              <button className="tv-back" onClick={() => { setActiveTeam(null); setMsg(''); }}>← Back</button>
            )}
            <h2 className="tv-title">{activeTeam ? activeTeam.name : 'Team Vaults'}</h2>
          </div>
          <button className="tv-close" onClick={onClose}>✕</button>
        </div>

        {msg && <div className="tv-msg">{msg}</div>}

        {!activeTeam ? (
          /* ── Team list ── */
          <div className="tv-body">
            {/* Create */}
            <div className="tv-section-title">Create a Team</div>
            <div className="tv-row">
              <input
                className="tv-input"
                placeholder="Team name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <button className="tv-btn primary" onClick={handleCreate} disabled={loading || !newName.trim()}>
                Create
              </button>
            </div>

            {/* Join */}
            <div className="tv-section-title">Join with Invite Code</div>
            <div className="tv-row">
              <input
                className="tv-input"
                placeholder="Invite code…"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <button className="tv-btn success" onClick={handleJoin} disabled={loading || !joinCode.trim()}>
                Join
              </button>
            </div>

            {/* My teams */}
            <div className="tv-section-title">My Teams ({teams.length})</div>
            {teams.length === 0
              ? <p className="tv-empty">No teams yet — create one or join with an invite code.</p>
              : teams.map(team => (
                <div key={team.id} className="tv-team-row" onClick={() => { setActiveTeam(team); setMsg(''); }}>
                  <div className="tv-team-info">
                    <span className="tv-team-name">{team.name}</span>
                    <span className="tv-team-meta">
                      {team.role === 'owner' ? '👑 Owner' : '👤 Member'} · {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                    </span>
                    {team.invite_code && (
                      <span className="tv-invite-code" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(team.invite_code); setMsg('Invite code copied!'); }}>
                        🔗 {team.invite_code} (click to copy)
                      </span>
                    )}
                  </div>
                  <div className="tv-team-actions">
                    <button
                      className="tv-leave-btn"
                      onClick={e => { e.stopPropagation(); handleLeave(team); }}
                    >{team.role === 'owner' ? '🗑' : '✕'}</button>
                    <span className="tv-arrow">›</span>
                  </div>
                </div>
              ))
            }
          </div>
        ) : (
          /* ── Team detail ── */
          <div className="tv-body">
            <div className="tv-tabs">
              <button className={`tv-tab ${tab === 'docs' ? 'active' : ''}`} onClick={() => setTab('docs')}>
                Documents ({teamDocs.length})
              </button>
              <button className={`tv-tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
                Members ({members.length})
              </button>
            </div>

            {tab === 'docs' && (
              <>
                <div className="tv-section-title">Share a Document</div>
                {documents.filter(d => !teamDocs.find(td => td.id === d.id)).length === 0
                  ? <p className="tv-empty">All your documents are already shared, or you have no documents.</p>
                  : documents.filter(d => !teamDocs.find(td => td.id === d.id)).map(doc => (
                    <div key={doc.id} className="tv-doc-row">
                      <span className="tv-doc-name">📄 {doc.name}</span>
                      <button className="tv-btn primary small" onClick={() => handleAddDoc(doc)}>Share</button>
                    </div>
                  ))
                }

                <div className="tv-section-title" style={{marginTop:'1rem'}}>Shared Documents</div>
                {teamDocs.length === 0
                  ? <p className="tv-empty">No shared documents yet.</p>
                  : teamDocs.map(d => (
                    <div key={d.id} className="tv-doc-row">
                      <span className="tv-doc-name">📄 {d.name}</span>
                      <button className="tv-remove-btn" onClick={() => handleRemoveDoc(d.id)}>✕</button>
                    </div>
                  ))
                }
              </>
            )}

            {tab === 'members' && (
              <>
                <div className="tv-section-title">Members</div>
                {members.map((m, i) => (
                  <div key={i} className="tv-member-row">
                    <div className="tv-member-avatar">{m.email[0].toUpperCase()}</div>
                    <div className="tv-member-info">
                      <span className="tv-member-email">{m.email}</span>
                      <span className="tv-member-role">{m.role === 'owner' ? '👑 Owner' : '👤 Member'}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
