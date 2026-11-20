import { getUserInitials } from '../../shared/lib/account'

export default function SettingsPage({ theme, setTheme, settings, user, onSaveTheme, setPage }) {
  const isGuest = Boolean(user?.guest || user?.isGuest)
  const changeTheme = (nextTheme) => {
    setTheme(nextTheme)
    onSaveTheme(nextTheme)
  }

  return (
    <section className="settings-page">
      <header className="settings-intro">
        <div><p className="settings-kicker">WORKSPACE PREFERENCES</p><h1>Settings</h1><p>Manage your appearance, account, and analysis privacy.</p></div>
        <div className="settings-private-badge"><span aria-hidden="true">✓</span> {isGuest ? 'Isolated demo workspace' : 'Private workspace'}</div>
      </header>
      <div className="settings-grid">
        <div className="settings-main-column">
          <section className="settings-card" aria-labelledby="appearance-heading">
            <div className="settings-card-heading"><div className="settings-icon appearance-icon" aria-hidden="true">◐</div><div><h2 id="appearance-heading">Appearance</h2><p>Choose how your workspace looks.</p></div></div>
            <div className="theme-options" role="group" aria-label="Color theme">
              <button className={`theme-option ${theme === 'light' ? 'selected' : ''}`} type="button" aria-pressed={theme === 'light'} onClick={() => changeTheme('light')}>
                <div className="theme-preview light-preview" aria-hidden="true"><span /><i /><i /><i /></div>
                <span className="theme-option-copy"><strong>Light mode</strong><small>Bright and clear</small></span>
                <span className="theme-check" aria-hidden="true">{theme === 'light' ? '✓' : ''}</span>
              </button>
              <button className={`theme-option ${theme === 'dark' ? 'selected' : ''}`} type="button" aria-pressed={theme === 'dark'} onClick={() => changeTheme('dark')}>
                <div className="theme-preview dark-preview" aria-hidden="true"><span /><i /><i /><i /></div>
                <span className="theme-option-copy"><strong>Dark mode</strong><small>Comfortable in low light</small></span>
                <span className="theme-check" aria-hidden="true">{theme === 'dark' ? '✓' : ''}</span>
              </button>
            </div>
            <p className="settings-footnote">Your choice is saved to your workspace preferences.</p>
          </section>
          <section className="settings-card" aria-labelledby="privacy-heading">
            <div className="settings-card-heading"><div className="settings-icon privacy-icon" aria-hidden="true">◇</div><div><h2 id="privacy-heading">Privacy & analysis data</h2><p>How uploaded files and reports are handled.</p></div></div>
            <div className="settings-facts">
              <div className="settings-fact"><span className="fact-symbol" aria-hidden="true">↗</span><div><strong>Original resume</strong><p>{isGuest ? 'Processed in memory and discarded after analysis.' : settings?.resumeStorageEnabled ? 'Stored in the configured private file storage.' : 'Processed in memory and discarded after analysis.'}</p></div><span className={`fact-badge ${settings?.resumeStorageEnabled && !isGuest ? 'badge-blue' : 'badge-green'}`}>{settings?.resumeStorageEnabled && !isGuest ? 'Private storage' : 'Not retained'}</span></div>
              <div className="settings-fact"><span className="fact-symbol" aria-hidden="true">◷</span><div><strong>Analysis reports</strong><p>Retention target: {isGuest ? 30 : settings?.analysisRetentionDays ?? 90} days. Delete a report anytime from history.</p></div><span className="fact-badge badge-blue">{isGuest ? 'This browser' : 'Your account'}</span></div>
              <div className="settings-fact"><span className="fact-symbol" aria-hidden="true">✦</span><div><strong>Analysis provider</strong><p>{isGuest || settings?.aiProvider === 'mock' || !settings?.aiProvider ? 'Local keyword matching; resume text is not sent to an external AI provider.' : `${settings.aiProvider} receives extracted resume text and the job description to generate your report.`}</p></div><span className="fact-badge badge-violet">{isGuest ? 'mock' : settings?.aiProvider || 'mock'}</span></div>
            </div>
            <button className="settings-action" type="button" onClick={() => setPage('history')}>Manage analysis history <span aria-hidden="true">→</span></button>
          </section>
        </div>
        <aside className="settings-side-column">
          <section className="settings-account-card" aria-labelledby="account-heading">
            <div className="settings-account-top"><div className="settings-large-avatar">{getUserInitials(user?.displayName, user?.email)}</div><span className="account-status"><i /> Active</span></div>
            <h2 id="account-heading">{user?.displayName || 'Guest'}</h2>
            <p>{isGuest ? 'Private browser session' : user?.email}</p>
            <div className="account-divider" />
            <div className="account-detail"><span>Account ID</span><strong>{user?.id}</strong></div>
          </section>
          <section className="settings-card session-card" aria-labelledby="session-heading">
            <div className="session-icon" aria-hidden="true">⌑</div>
            <h2 id="session-heading">{isGuest ? 'Guest session' : 'Secure session'}</h2>
            <p>{isGuest ? 'This browser has a private demo workspace. Guest data expires after 30 days.' : 'You’re signed in on this browser. Your access session expires after one hour. Sign out from the account menu.'}</p>
          </section>
        </aside>
      </div>
    </section>
  )
}
