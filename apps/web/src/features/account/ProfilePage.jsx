import { useEffect, useState } from 'react'
import { getUserInitials } from '../../shared/lib/account'

export default function ProfilePage({ user, settings, onSaveProfile, setPage }) {
  const isGuest = Boolean(user?.guest || user?.isGuest)
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setDisplayName(user?.displayName || '')
    setIsEditing(false)
  }, [user?.displayName])

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await onSaveProfile(displayName)
      setMessage('Profile updated.')
      setIsEditing(false)
    } catch (error) {
      setMessage(error.message || 'Could not update your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="profile-page">
      <header className="profile-intro">
        <div><p className="profile-kicker">ACCOUNT OVERVIEW</p><h1>Your profile</h1><p>Manage your account name and view workspace details.</p></div>
        <span className="profile-readonly"><span aria-hidden="true">✓</span> {isGuest ? 'Guest workspace' : 'Signed-in account'}</span>
      </header>
      <div className="profile-grid">
        <div className="profile-main-column">
          <section className="profile-identity-card" aria-label="Profile summary">
            <div className="profile-identity-top"><div className="profile-avatar">{getUserInitials(user?.displayName, user?.email)}</div><span className="profile-active"><i /> Active</span></div>
            <div className="profile-identity-copy"><span>AI RESUME ANALYZER MEMBER</span><h2>{user?.displayName || 'Guest'}</h2><p>{isGuest ? 'Private browser session' : user?.email}</p></div>
            <div className="profile-identity-footer"><span aria-hidden="true">◇</span> Your analysis history is isolated to this account.</div>
          </section>
          <section className="profile-details-card" aria-labelledby="profile-details-heading">
            <div className="profile-section-heading"><div><h2 id="profile-details-heading">Account details</h2><p>Update your display name.</p></div>{isGuest
              ? <span className="profile-readonly-tag">Guest</span>
              : isEditing
                ? <span className="profile-readonly-tag">Editing</span>
                : <button className="profile-edit-trigger" type="button" onClick={() => { setMessage(''); setIsEditing(true) }}><span aria-hidden="true">✎</span> Edit</button>}</div>
            {!isGuest ? (
              <>
                {isEditing ? (
                  <form className="profile-edit-form" onSubmit={saveProfile}>
                    <label className="profile-name-field">Full name<input required maxLength={100} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
                    <div className="profile-detail-row"><span className="profile-detail-icon email-icon" aria-hidden="true">@</span><div><small>Email address</small><strong>{user?.email}</strong></div></div>
                    <div className="profile-detail-row"><span className="profile-detail-icon id-icon" aria-hidden="true">#</span><div><small>Account ID</small><strong className="profile-id">{user?.id}</strong></div></div>
                    {message && <p role="status">{message}</p>}
                    <div className="profile-form-actions"><button className="settings-action" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button><button className="profile-cancel-button" type="button" disabled={saving} onClick={() => { setDisplayName(user?.displayName || ''); setMessage(''); setIsEditing(false) }}>Cancel</button></div>
                  </form>
                ) : (
                  <div className="profile-readonly-details">
                    <div className="profile-detail-row"><span className="profile-detail-icon" aria-hidden="true">♙</span><div><small>Full name</small><strong>{user?.displayName || 'Candidate'}</strong></div></div>
                    <div className="profile-detail-row"><span className="profile-detail-icon email-icon" aria-hidden="true">@</span><div><small>Email address</small><strong>{user?.email}</strong></div></div>
                    <div className="profile-detail-row"><span className="profile-detail-icon id-icon" aria-hidden="true">#</span><div><small>Account ID</small><strong className="profile-id">{user?.id}</strong></div></div>
                    {message && <p className="profile-save-message" role="status">{message}</p>}
                  </div>
                )}
              </>
            ) : <p className="guest-profile-note">Guest profiles are temporary and can’t be changed. Create an account to save a permanent profile.</p>}
          </section>
        </div>
        <aside className="profile-side-column">
          <section className="profile-privacy-card" aria-labelledby="profile-privacy-heading">
            <div className="profile-privacy-icon" aria-hidden="true">◇</div>
            <p className="profile-privacy-kicker">{isGuest ? 'ISOLATED DEMO SESSION' : 'PRIVATE WORKSPACE'}</p>
            <h2 id="profile-privacy-heading">Your data, under your account.</h2>
            <p className="profile-privacy-description">{isGuest ? 'This guest workspace is private to this browser and expires automatically.' : 'Your analysis reports are accessible only to your account.'}</p>
            <div className="profile-privacy-fact"><span>Report retention</span><strong>{isGuest ? '30 days' : `${settings?.analysisRetentionDays ?? 90} days`}</strong></div>
            <div className="profile-privacy-fact"><span>Original resumes</span><strong>Not retained</strong></div>
            <button className="profile-link-button" type="button" onClick={() => setPage('settings')}>Review privacy settings <span aria-hidden="true">→</span></button>
          </section>
          <section className="profile-actions-card" aria-labelledby="profile-actions-heading">
            <h2 id="profile-actions-heading">Workspace shortcuts</h2>
            <button type="button" onClick={() => setPage('history')}><span className="shortcut-icon history-shortcut" aria-hidden="true">◷</span><span><strong>Analysis history</strong><small>View or delete saved reports</small></span><b aria-hidden="true">→</b></button>
            <button type="button" onClick={() => setPage('settings')}><span className="shortcut-icon settings-shortcut" aria-hidden="true">⚙</span><span><strong>Privacy & settings</strong><small>Review theme and data handling</small></span><b aria-hidden="true">→</b></button>
          </section>
        </aside>
      </div>
    </section>
  )
}
