import { useEffect, useRef } from 'react'
import AuthModal from '../../features/auth/AuthModal'
import { getUserInitials } from '../../shared/lib/account'
import Icon from '../../shared/ui/Icon'

export default function AppShell({
  theme,
  setTheme,
  page,
  setPage,
  user,
  history,
  busyId,
  openAnalysis,
  openSubscriptionPage,
  clearSession,
  activityOpen,
  setActivityOpen,
  userMenuOpen,
  setUserMenuOpen,
  authOpen,
  authMode,
  authForm,
  setAuthForm,
  authError,
  authLoading,
  googleButtonRef,
  googleClientId,
  onAuthSubmit,
  onAuthClose,
  onAuthModeChange,
  children,
}) {
  const activityRef = useRef(null)
  const userMenuRef = useRef(null)
  const isGuest = Boolean(user?.guest || user?.isGuest)
  const navigate = (nextPage) => {
    if (isGuest && nextPage !== 'dashboard') {
      onAuthModeChange('login')
      return
    }
    setPage(nextPage)
  }
  const toggleActivity = () => {
    setUserMenuOpen(false)
    if (isGuest) {
      onAuthModeChange('login')
      return
    }
    setActivityOpen((open) => !open)
  }

  useEffect(() => {
    if (!activityOpen) return
    const closeOnOutsideClick = (event) => {
      if (!activityRef.current?.contains(event.target)) setActivityOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setActivityOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [activityOpen, setActivityOpen])

  useEffect(() => {
    if (!userMenuOpen) return
    const closeOnOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) setUserMenuOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [userMenuOpen, setUserMenuOpen])

  return (
    <div className="shell" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">✦</div><strong>AI Resume<br />Analyzer</strong></div>
        <nav aria-label="Main navigation">
          <button className={`nav ${page === 'dashboard' ? 'active' : ''}`} aria-label="Dashboard" onClick={() => navigate('dashboard')}><Icon>▦</Icon><span className="nav-label">Dashboard</span></button>
          <button className={`nav ${page === 'history' ? 'active' : ''}`} aria-label="My History" onClick={() => navigate('history')}><Icon>◷</Icon><span className="nav-label">My History</span></button>
          <button className={`nav ${page === 'profile' ? 'active' : ''}`} aria-label="Profile" onClick={() => navigate('profile')}><Icon>♙</Icon><span className="nav-label">Profile</span></button>
          <button className={`nav ${page === 'settings' ? 'active' : ''}`} aria-label="Settings" onClick={() => navigate('settings')}><Icon>⚙</Icon><span className="nav-label">Settings</span></button>
        </nav>
        <div className="sidebar-bottom"><div className="upgrade"><b>★</b><strong>{isGuest ? 'Guest workspace' : 'Private workspace'}</strong><p>{isGuest ? 'Your demo data is isolated to this browser.' : 'Your analyses are only accessible to your account.'}</p></div></div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <div className="activity-wrap" ref={activityRef}>
              <button className="activity-button" type="button" aria-label="Recent activity" aria-haspopup="dialog" aria-expanded={activityOpen} aria-controls="recent-activity-panel" title={isGuest ? 'Sign in to view recent activity' : 'Recent activity'} onClick={toggleActivity}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
              </button>
              {activityOpen && <section className="activity-popover" id="recent-activity-panel" role="dialog" aria-label="Recent activity">
                <div className="activity-popover-heading"><div><h2>Recent activity</h2><p>Your latest saved analyses</p></div><button type="button" aria-label="Close recent activity" onClick={() => setActivityOpen(false)}>×</button></div>
                {history.length ? <>
                  <div className="activity-items">{history.slice(0, 4).map((item) => {
                    const title = item.title || item.resumeFilename || 'Resume analysis'
                    return <button className="activity-item" type="button" key={item.id} onClick={() => { setActivityOpen(false); openAnalysis(item.id) }} disabled={busyId === item.id}>
                      <span className="activity-complete" aria-hidden="true">✓</span><span className="activity-item-copy"><strong>{title}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></span><b>{Number(item.coverage) || 0}%</b>
                    </button>
                  })}</div>
                  <button className="activity-footer" type="button" onClick={() => { setActivityOpen(false); navigate('history') }}>View all reports <span aria-hidden="true">→</span></button>
                </> : <div className="activity-empty"><span aria-hidden="true">✦</span><strong>No recent activity</strong><p>Your completed analyses will appear here.</p><button type="button" onClick={() => { setActivityOpen(false); navigate('dashboard') }}>Analyze a resume</button></div>}
              </section>}
            </div>
            <button className={`topbar-subscription-button ${page === 'subscription' ? 'active' : ''}`} type="button" aria-label="Open subscription" title="Subscription plans" onClick={openSubscriptionPage}>
              <span className="subscription-button-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m3 8 4 3 5-6 5 6 4-3-2 11H5L3 8Z" /><path d="M5 16h14" /></svg></span><span className="subscription-label">Subscription</span>
            </button>
            <div className="user-menu-wrap" ref={userMenuRef}>
              <button className={`account-trigger ${userMenuOpen ? 'is-open' : ''}`} type="button" aria-label={`Account options for ${user?.displayName || user?.email || 'guest'}`} aria-expanded={userMenuOpen} aria-controls="account-menu" title="Account menu" onClick={() => { setActivityOpen(false); setUserMenuOpen((open) => !open) }}>
                <span className="avatar-shell"><span className="avatar">{getUserInitials(user?.displayName, user?.email)}</span><i className="avatar-status" aria-hidden="true" /></span>
                <span className="account-trigger-copy"><strong>{user?.displayName || (isGuest ? 'Guest workspace' : 'Your account')}</strong><small>{user?.email || (isGuest ? 'Sign in to sync your data' : 'Account details')}</small></span>
                <svg className="account-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" /></svg>
              </button>
              {userMenuOpen && <div className="user-menu" id="account-menu" role="region" aria-label="Account navigation">
                <div className="user-menu-summary"><div className="user-menu-avatar">{getUserInitials(user?.displayName, user?.email)}</div><div><strong>{user?.displayName || (isGuest ? 'Guest workspace' : 'Your account')}</strong><small>{user?.email || (isGuest ? 'Private to this browser' : 'Loading account details…')}</small></div></div>
                <div className="user-menu-divider" />
                {isGuest ? <>
                  <button type="button" onClick={() => onAuthModeChange('login')}><span aria-hidden="true">↪</span><span>Sign in</span><b aria-hidden="true">→</b></button>
                  <button type="button" onClick={() => onAuthModeChange('register')}><span aria-hidden="true">＋</span><span>Create account</span><b aria-hidden="true">→</b></button>
                </> : <>
                  <button type="button" onClick={() => { navigate('profile'); setUserMenuOpen(false) }}><span aria-hidden="true">♙</span><span>My profile</span><b aria-hidden="true">→</b></button>
                  <button type="button" onClick={() => { navigate('settings'); setUserMenuOpen(false) }}><span aria-hidden="true">⚙</span><span>Settings</span><b aria-hidden="true">→</b></button>
                  <div className="user-menu-divider" />
                  <button type="button" className="user-menu-signout" onClick={() => { setUserMenuOpen(false); clearSession() }}><span aria-hidden="true">↪</span><span>Sign out</span></button>
                </>}
              </div>}
            </div>
            <button className="theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-pressed={theme === 'dark'} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span></button>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
      {authOpen && <AuthModal
        mode={authMode}
        form={authForm}
        setForm={setAuthForm}
        error={authError}
        loading={authLoading}
        googleButtonRef={googleButtonRef}
        googleClientId={googleClientId}
        onSubmit={onAuthSubmit}
        onClose={onAuthClose}
        onToggleMode={() => onAuthModeChange(authMode === 'login' ? 'register' : 'login')}
      />}
    </div>
  )
}
