import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001' })
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const Icon = ({ children }) => <span className="icon" aria-hidden="true">{children}</span>

export default function App() {
  const inputRef = useRef(null)
  const activityRef = useRef(null)
  const userMenuRef = useRef(null)
  const [token, setToken] = useState(() => sessionStorage.getItem('accessToken'))
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('resume-analyzer-theme') === 'dark' ? 'dark' : 'light')
  const [activityOpen, setActivityOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', displayName: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [jd, setJd] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [settings, setSettings] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('resume-analyzer-theme', theme)
  }, [theme])

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
  }, [activityOpen])

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
  }, [userMenuOpen])

  const clearSession = () => {
    sessionStorage.removeItem('accessToken')
    setToken(null)
    setUser(null)
    setHistory([])
    setResult(null)
  }

  const loadHistory = async () => {
    const { data } = await api.get('/analyses')
    setHistory(data)
  }

  useEffect(() => {
    if (!token) return
    let active = true
    Promise.all([api.get('/auth/me'), api.get('/analyses'), api.get('/auth/settings')])
      .then(([me, analyses, accountSettings]) => {
        if (!active) return
        setUser(me.data)
        setHistory(analyses.data)
        setSettings(accountSettings.data)
      })
      .catch((requestError) => {
        if (active && requestError.response?.status === 401) clearSession()
        else if (active) setError('Could not load your account data. Check that the API is available.')
      })
    return () => { active = false }
  }, [token])

  const submitAuth = async (event) => {
    event.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      const { data } = await api.post(`/auth/${authMode === 'register' ? 'register' : 'login'}`, authForm)
      sessionStorage.setItem('accessToken', data.accessToken)
      setToken(data.accessToken)
      setUser(data.user)
    } catch (requestError) {
      setAuthError(requestError.response?.data?.message || 'Authentication failed. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const validateFile = (candidate) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(candidate?.type)) return 'Please upload a PDF or DOCX file.'
    if (candidate.size > 5 * 1024 * 1024) return 'File must be smaller than 5 MB.'
    setError('')
    setFile(candidate)
    return ''
  }

  const analyze = async () => {
    setError('')
    if (!file) return setError('Please upload a resume first.')
    if (!jd.trim()) return setError('Please provide a job description.')
    try {
      setStatus('analyzing')
      const form = new FormData()
      form.append('resume', file)
      form.append('jobDescription', jd)
      const { data } = await api.post('/analyses', form)
      setResult(data)
      setStatus('complete')
      setPage('dashboard')
      loadHistory().catch(() => setError('Analysis saved, but history could not be refreshed.'))
    } catch (requestError) {
      if (requestError.response?.status === 401) clearSession()
      setStatus('failed')
      setError(requestError.response?.data?.message || 'The analysis could not be completed.')
    }
  }

  const openAnalysis = async (id) => {
    setBusyId(id)
    try {
      const { data } = await api.get(`/analyses/${id}`)
      setResult(data)
      setStatus('complete')
      setPage('report')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load this report.')
    } finally {
      setBusyId('')
    }
  }

  const deleteAnalysis = async (id) => {
    if (!window.confirm('Delete this analysis and its stored resume, if available?')) return
    setBusyId(id)
    try {
      await api.delete(`/analyses/${id}`)
      setHistory((items) => items.filter((item) => item.id !== id))
      if (result?.id === id || result?._id === id) {
        setResult(null)
        setPage('dashboard')
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not delete this analysis.')
    } finally {
      setBusyId('')
    }
  }

  const exportAnalysis = async (id) => {
    try {
      const { data } = await api.get(`/analyses/${id}/export`)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `resume-analysis-${id}.json`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not export this report.')
    }
  }

  const retryAnalysis = async () => {
    const previousJobDescription = result?.jobDescription || jd
    if (!previousJobDescription) return
    setJd(previousJobDescription)
    setFile(null)
    setError('Choose the resume file again to run a fresh analysis.')
    setPage('dashboard')
  }

  if (!token) {
    return (
      <main className="auth-page" data-theme={theme}>
        <section className="auth-visual" aria-label="AI Resume Analyzer introduction">
          <div className="auth-brand"><div className="brand-mark">✦</div><strong>AI Resume Analyzer</strong></div>
          <div className="auth-visual-copy"><span className="auth-visual-eyebrow">YOUR NEXT STEP STARTS HERE</span><h2>Make your experience<br /><em>stand out.</em></h2><p>Understand how your resume matches a role, find the gaps, and plan your next move with confidence.</p><div className="auth-visual-points"><span><i>✓</i>Evidence-based feedback</span><span><i>◇</i>Private workspace</span></div></div>
          <div className="auth-visual-footer"><span aria-hidden="true">✦</span> A clearer view of your next opportunity.</div>
        </section>
        <section className="auth-panel">
          <form className="auth-card" onSubmit={submitAuth}>
            <div className="auth-mobile-brand"><div className="brand-mark">✦</div><strong>AI Resume Analyzer</strong></div>
            <div className="auth-heading"><p className="auth-kicker">{authMode === 'login' ? 'YOUR PRIVATE WORKSPACE' : 'GET STARTED'}</p><h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1><p>{authMode === 'login' ? 'Sign in to continue to your resume insights.' : 'Set up your account to save and manage your analyses.'}</p></div>
            {authMode === 'register' && <label>Name<input required maxLength="100" autoComplete="name" value={authForm.displayName} onChange={(event) => setAuthForm({ ...authForm, displayName: event.target.value })} /></label>}
            <label>Email address<input type="email" required autoComplete="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
            <label>Password<input type="password" required minLength="8" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
            {authError && <p className="error" role="alert">{authError}</p>}
            <button className="analyze auth-submit" disabled={authLoading}>{authLoading ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}<span aria-hidden="true">→</span></button>
            <div className="auth-divider"><span>OR</span></div>
            <button className="auth-toggle" type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}>
              {authMode === 'login' ? <>New to the analyzer? <strong>Create an account</strong></> : <>Already have an account? <strong>Sign in</strong></>}
            </button>
            <p className="auth-privacy-note"><span aria-hidden="true">◇</span> Your reports are private to your account.</p>
          </form>
        </section>
      </main>
    )
  }

  const analysis = result?.result || result
  const averageCoverage = history.length
    ? Math.round(history.reduce((total, item) => total + (Number(item.coverage) || 0), 0) / history.length)
    : 0
  const highestCoverage = history.reduce((highest, item) => Math.max(highest, Number(item.coverage) || 0), 0)

  return (
    <div className="shell" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">✦</div><strong>AI Resume<br />Analyzer</strong></div>
        <nav>
          <button className={`nav ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}><Icon>▦</Icon>Dashboard</button>
          <button className="nav" onClick={() => { setPage('dashboard'); setResult(null) }}><Icon>⇧</Icon>Analyze Resume</button>
          <button className={`nav ${page === 'history' ? 'active' : ''}`} onClick={() => setPage('history')}><Icon>◷</Icon>My History</button>
          <button className={`nav ${page === 'profile' ? 'active' : ''}`} onClick={() => setPage('profile')}><Icon>♙</Icon>Profile</button>
          <button className={`nav ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}><Icon>⚙</Icon>Settings</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade"><b>★</b><strong>Private workspace</strong><p>Your analyses are only accessible to your account.</p></div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <div className="activity-wrap" ref={activityRef}>
              <button className="activity-button" type="button" aria-label="Recent activity" aria-haspopup="dialog" aria-expanded={activityOpen} aria-controls="recent-activity-panel" title="Recent activity" onClick={() => { setUserMenuOpen(false); setActivityOpen((open) => !open) }}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
              </button>
              {activityOpen && <section className="activity-popover" id="recent-activity-panel" role="dialog" aria-label="Recent activity">
                <div className="activity-popover-heading"><div><h2>Recent activity</h2><p>Your latest saved analyses</p></div><button type="button" aria-label="Close recent activity" onClick={() => setActivityOpen(false)}>×</button></div>
                {history.length ? (
                  <>
                    <div className="activity-items">{history.slice(0, 4).map((item) => {
                      const title = item.title || item.resumeFilename || 'Resume analysis'
                      return <button className="activity-item" type="button" key={item.id} onClick={() => { setActivityOpen(false); openAnalysis(item.id) }} disabled={busyId === item.id}>
                        <span className="activity-complete" aria-hidden="true">✓</span><span className="activity-item-copy"><strong>{title}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></span><b>{Number(item.coverage) || 0}%</b>
                      </button>
                    })}</div>
                    <button className="activity-footer" type="button" onClick={() => { setActivityOpen(false); setPage('history') }}>View all reports <span aria-hidden="true">→</span></button>
                  </>
                ) : (
                  <div className="activity-empty"><span aria-hidden="true">✦</span><strong>No recent activity</strong><p>Your completed analyses will appear here.</p><button type="button" onClick={() => { setActivityOpen(false); setPage('dashboard') }}>Analyze a resume</button></div>
                )}
              </section>}
            </div>
            <div className="user-menu-wrap" ref={userMenuRef}>
              <button className={`account-trigger ${userMenuOpen ? 'is-open' : ''}`} type="button" aria-label={`Account options for ${user?.displayName || user?.email || 'user'}`} aria-expanded={userMenuOpen} aria-controls="account-menu" title="Account menu" onClick={() => { setActivityOpen(false); setUserMenuOpen((open) => !open) }}>
                <span className="avatar-shell"><span className="avatar">{(user?.displayName || user?.email || 'U').slice(0, 2).toUpperCase()}</span><i className="avatar-status" aria-hidden="true" /></span>
                <svg className="account-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" /></svg>
              </button>
              {userMenuOpen && <div className="user-menu" id="account-menu" role="region" aria-label="Account navigation">
                <div className="user-menu-summary"><div className="user-menu-avatar">{(user?.displayName || user?.email || 'U').slice(0, 2).toUpperCase()}</div><div><strong>{user?.displayName || 'Your account'}</strong><small>{user?.email}</small></div></div>
                <div className="user-menu-divider" />
                <button type="button" onClick={() => { setPage('profile'); setUserMenuOpen(false) }}><span aria-hidden="true">♙</span><span>My profile</span><b aria-hidden="true">→</b></button>
                <button type="button" onClick={() => { setPage('settings'); setUserMenuOpen(false) }}><span aria-hidden="true">⚙</span><span>Settings</span><b aria-hidden="true">→</b></button>
                <div className="user-menu-divider" />
                <button type="button" className="user-menu-signout" onClick={() => { setUserMenuOpen(false); clearSession() }}><span aria-hidden="true">↪</span><span>Sign out</span></button>
              </div>}
            </div>
            <button className="theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-pressed={theme === 'dark'} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span></button>
            <strong>{user?.displayName || user?.email}</strong>
          </div>
        </header>

        <div className="content">
          {page === 'history' ? (
            <section className="history-page">
              <header className="history-intro">
                <div><p className="history-kicker">YOUR WORKSPACE / REPORTS</p><h1>Analysis history</h1><p>Review your saved resume-to-role analyses and reports.</p></div>
                <button className="history-new-analysis" type="button" onClick={() => { setPage('dashboard'); setResult(null) }}><span aria-hidden="true">＋</span> Analyze a resume</button>
              </header>
              <div className="history-stats">
                <article className="history-stat-card"><span className="history-stat-icon reports-stat" aria-hidden="true">▤</span><div><small>Saved reports</small><strong>{history.length}</strong><span>In your private workspace</span></div></article>
                <article className="history-stat-card"><span className="history-stat-icon average-stat" aria-hidden="true">◉</span><div><small>Average coverage</small><strong>{averageCoverage}%</strong><span>Across your reports</span></div></article>
                <article className="history-stat-card"><span className="history-stat-icon best-stat" aria-hidden="true">↗</span><div><small>Highest coverage</small><strong>{highestCoverage}%</strong><span>Best report match</span></div></article>
              </div>
              <section className="history-list-card" aria-labelledby="history-list-heading">
                <div className="history-list-heading"><div><h2 id="history-list-heading">Your analyses</h2><p>Open a report to review evidence and recommendations.</p></div><span className="history-count">{history.length} {history.length === 1 ? 'report' : 'reports'}</span></div>
                {history.length === 0 ? (
                  <div className="history-empty"><div className="history-empty-icon" aria-hidden="true">▤</div><h3>No reports yet</h3><p>Your completed analyses will appear here. Start by uploading a resume and adding a job description.</p><button type="button" onClick={() => { setPage('dashboard'); setResult(null) }}>Create your first analysis <span aria-hidden="true">→</span></button></div>
                ) : (
                  <>
                    <div className="history-table-header" aria-hidden="true"><span>Resume & role</span><span>Analyzed</span><span>Coverage</span><span>Actions</span></div>
                    <div className="history-list">
                      {history.map((item) => {
                        const coverage = Math.max(0, Math.min(100, Number(item.coverage) || 0))
                        const title = item.title || item.resumeFilename || 'Resume analysis'
                        const analyzedAt = new Date(item.createdAt)
                        return (
                          <article className="history-row" key={item.id}>
                            <span className="history-file-icon" aria-hidden="true">▤</span>
                            <button className="history-title" type="button" onClick={() => openAnalysis(item.id)} disabled={busyId === item.id}>
                              <strong>{title}</strong><small>{item.resumeFilename || 'Resume analysis'} <span>·</span> Evidence-based report</small>
                            </button>
                            <div className="history-date"><strong>{analyzedAt.toLocaleDateString()}</strong><small>{analyzedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>
                            <div className="history-coverage"><div><strong>{coverage}%</strong><small>coverage</small></div><span className="coverage-track"><i style={{ width: `${coverage}%` }} /></span></div>
                            <div className="history-actions">
                              <button type="button" className="history-view-action" onClick={() => openAnalysis(item.id)} disabled={busyId === item.id}>View</button>
                              <button type="button" onClick={() => exportAnalysis(item.id)} aria-label={`Export ${title}`}>Export</button>
                              <button type="button" className="history-delete-action" onClick={() => deleteAnalysis(item.id)} disabled={busyId === item.id} aria-label={`Delete ${title}`}>Delete</button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </>
                )}
              </section>
            </section>
          ) : page === 'profile' ? (
            <section className="profile-page">
              <header className="profile-intro">
                <div><p className="profile-kicker">ACCOUNT OVERVIEW</p><h1>Your profile</h1><p>View the account details for your private workspace.</p></div>
                <span className="profile-readonly"><span aria-hidden="true">✓</span> Signed-in account</span>
              </header>
              <div className="profile-grid">
                <div className="profile-main-column">
                  <section className="profile-identity-card" aria-label="Profile summary">
                    <div className="profile-identity-top"><div className="profile-avatar">{(user?.displayName || user?.email || 'U').slice(0, 2).toUpperCase()}</div><span className="profile-active"><i /> Signed in</span></div>
                    <div className="profile-identity-copy"><span>AI RESUME ANALYZER MEMBER</span><h2>{user?.displayName || 'Candidate'}</h2><p>{user?.email}</p></div>
                    <div className="profile-identity-footer"><span aria-hidden="true">◇</span> Your account and analysis history are private to you.</div>
                  </section>
                  <section className="profile-details-card" aria-labelledby="profile-details-heading">
                    <div className="profile-section-heading"><div><h2 id="profile-details-heading">Account details</h2><p>Information associated with your sign-in.</p></div><span className="profile-readonly-tag">Read only</span></div>
                    <div className="profile-detail-row"><span className="profile-detail-icon" aria-hidden="true">♙</span><div><small>Full name</small><strong>{user?.displayName || 'Candidate'}</strong></div></div>
                    <div className="profile-detail-row"><span className="profile-detail-icon email-icon" aria-hidden="true">@</span><div><small>Email address</small><strong>{user?.email}</strong></div></div>
                    <div className="profile-detail-row"><span className="profile-detail-icon id-icon" aria-hidden="true">#</span><div><small>Account ID</small><strong className="profile-id">{user?.id}</strong></div></div>
                  </section>
                </div>
                <aside className="profile-side-column">
                  <section className="profile-privacy-card" aria-labelledby="profile-privacy-heading">
                    <div className="profile-privacy-icon" aria-hidden="true">◇</div>
                    <p className="profile-privacy-kicker">PRIVATE WORKSPACE</p>
                    <h2 id="profile-privacy-heading">Your data, under your account.</h2>
                    <p className="profile-privacy-description">Your analysis reports are accessible only to your account.</p>
                    <div className="profile-privacy-fact"><span>Report retention</span><strong>{settings?.analysisRetentionDays ?? 90} days</strong></div>
                    <div className="profile-privacy-fact"><span>Original resumes</span><strong>{settings?.resumeStorageEnabled ? 'Private storage' : 'Not retained'}</strong></div>
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
          ) : page === 'settings' ? (
            <section className="settings-page">
              <header className="settings-intro">
                <div><p className="settings-kicker">WORKSPACE PREFERENCES</p><h1>Settings</h1><p>Manage your appearance, account, and analysis privacy.</p></div>
                <div className="settings-private-badge"><span aria-hidden="true">✓</span> Private workspace</div>
              </header>
              <div className="settings-grid">
                <div className="settings-main-column">
                  <section className="settings-card" aria-labelledby="appearance-heading">
                    <div className="settings-card-heading"><div className="settings-icon appearance-icon" aria-hidden="true">◐</div><div><h2 id="appearance-heading">Appearance</h2><p>Choose how your workspace looks.</p></div></div>
                    <div className="theme-options" role="group" aria-label="Color theme">
                      <button className={`theme-option ${theme === 'light' ? 'selected' : ''}`} type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
                        <div className="theme-preview light-preview" aria-hidden="true"><span /><i /><i /><i /></div>
                        <span className="theme-option-copy"><strong>Light mode</strong><small>Bright and clear</small></span>
                        <span className="theme-check" aria-hidden="true">{theme === 'light' ? '✓' : ''}</span>
                      </button>
                      <button className={`theme-option ${theme === 'dark' ? 'selected' : ''}`} type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
                        <div className="theme-preview dark-preview" aria-hidden="true"><span /><i /><i /><i /></div>
                        <span className="theme-option-copy"><strong>Dark mode</strong><small>Comfortable in low light</small></span>
                        <span className="theme-check" aria-hidden="true">{theme === 'dark' ? '✓' : ''}</span>
                      </button>
                    </div>
                    <p className="settings-footnote">Your choice is saved in this browser.</p>
                  </section>

                  <section className="settings-card" aria-labelledby="privacy-heading">
                    <div className="settings-card-heading"><div className="settings-icon privacy-icon" aria-hidden="true">◇</div><div><h2 id="privacy-heading">Privacy & analysis data</h2><p>How uploaded files and reports are handled.</p></div></div>
                    <div className="settings-facts">
                      <div className="settings-fact"><span className="fact-symbol" aria-hidden="true">↗</span><div><strong>Original resume</strong><p>{settings?.resumeStorageEnabled ? 'Stored in the configured private file storage.' : 'Processed in memory and discarded after analysis.'}</p></div><span className={`fact-badge ${settings?.resumeStorageEnabled ? 'badge-blue' : 'badge-green'}`}>{settings?.resumeStorageEnabled ? 'Private storage' : 'Not retained'}</span></div>
                      <div className="settings-fact"><span className="fact-symbol" aria-hidden="true">◷</span><div><strong>Analysis reports</strong><p>Retention target: {settings?.analysisRetentionDays ?? 90} days. Delete a report anytime from history.</p></div><span className="fact-badge badge-blue">Your account</span></div>
                      <div className="settings-fact"><span className="fact-symbol" aria-hidden="true">✦</span><div><strong>Analysis provider</strong><p>{settings?.aiProvider === 'mock' || !settings?.aiProvider ? 'Local keyword matching; resume text is not sent to an external AI provider.' : `${settings.aiProvider} receives extracted resume text and the job description to generate your report.`}</p></div><span className="fact-badge badge-violet">{settings?.aiProvider || 'mock'}</span></div>
                    </div>
                    <button className="settings-action" type="button" onClick={() => setPage('history')}>Manage analysis history <span aria-hidden="true">→</span></button>
                  </section>
                </div>

                <aside className="settings-side-column">
                  <section className="settings-account-card" aria-labelledby="account-heading">
                    <div className="settings-account-top"><div className="settings-large-avatar">{(user?.displayName || user?.email || 'U').slice(0, 2).toUpperCase()}</div><span className="account-status"><i /> Active</span></div>
                    <h2 id="account-heading">{user?.displayName || 'Your account'}</h2>
                    <p>{user?.email}</p>
                    <div className="account-divider" />
                    <div className="account-detail"><span>Account ID</span><strong>{user?.id}</strong></div>
                  </section>
                  <section className="settings-card session-card" aria-labelledby="session-heading">
                    <div className="session-icon" aria-hidden="true">⌑</div>
                    <h2 id="session-heading">Secure session</h2>
                    <p>You’re signed in on this browser. Your access session expires after one hour. Sign out from the account menu.</p>
                  </section>
                </aside>
              </div>
            </section>
          ) : page === 'report' && result ? (
            <section className="report-page">
              <div className="report-toolbar"><button onClick={() => setPage('history')}>← Back to history</button><div><button onClick={() => exportAnalysis(result.id || result._id)}>Export report</button><button onClick={retryAnalysis}>Analyze again</button></div></div>
              <div className="panel report-summary">
                <h1>{result.title || 'Resume Analysis'}</h1>
                <p>{result.resumeFilename} · {result.createdAt ? new Date(result.createdAt).toLocaleString() : ''}</p>
                <div className="score-pill">{analysis?.coverage}% coverage · Coverage indicator, not hiring probability</div>
                <p>{analysis?.summary}</p>
              </div>
              <div className="report-columns">
                <div className="panel"><h2>Requirement evidence</h2>{analysis?.requirements?.map((item) => <article className="evidence-item" key={item.requirement}><b>{item.requirement} · {item.status}</b><p>{item.explanation}</p>{item.resumeEvidence && <blockquote>{item.resumeEvidence}</blockquote>}</article>)}</div>
                <div className="panel"><h2>Strengths</h2><ul>{analysis?.strengths?.map((item) => <li key={item}>{item}</li>)}</ul><h2>Areas to improve</h2><ul>{analysis?.gaps?.map((item) => <li key={item}>{item}</li>)}</ul><h2>Recommendations</h2><ul>{analysis?.recommendations?.map((item) => <li key={item.action}><b>{item.action}</b><p>{item.reason}</p></li>)}</ul><h2>Limitations</h2><ul>{analysis?.limitations?.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
            </section>
          ) : (
            <>
              <section className="analyzer-page">
                <header className="analyzer-intro">
                  <div><p className="analyzer-kicker">AI-POWERED CAREER TOOL</p><h1>Align your resume with <span>the role.</span></h1><p>Upload your resume and a job description to get clear, evidence-based feedback.</p></div>
                  <div className="analyzer-intro-badge"><span aria-hidden="true">✦</span> Resume insights</div>
                </header>
                <div className="analyzer-form-grid">
                  <section className="analyzer-card" aria-labelledby="resume-upload-heading">
                    <div className="analyzer-card-heading"><span className="analyzer-step-number">01</span><div><h2 id="resume-upload-heading">Upload your resume</h2><p>Share your experience and skills.</p></div></div>
                    <div className={`resume-dropzone ${file ? 'has-file' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                      event.preventDefault()
                      const candidate = event.dataTransfer.files[0]
                      setError(validateFile(candidate))
                    }}>
                      <input ref={inputRef} hidden type="file" accept=".pdf,.docx" onChange={(event) => setError(validateFile(event.target.files[0]))} />
                      {file ? (
                        <div className="resume-selected"><span className="resume-file-icon" aria-hidden="true">▤</span><div><strong>{file.name}</strong><small>{(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to analyze</small></div><button className="choose" type="button" onClick={() => inputRef.current?.click()}>Change</button></div>
                      ) : (
                        <div className="resume-empty"><button className="upload-mark" type="button" aria-label="Choose a resume file" title="Choose a resume file" onClick={() => inputRef.current?.click()}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 16l-4-4-4 4M12 12v9" /><path d="M20.4 18.4A5.5 5.5 0 0 0 18 8h-1.3A8 8 0 1 0 4 16.3" /></svg></button><h3>Drag & drop your resume here</h3><p>or browse files from your device</p><button className="choose" type="button" onClick={() => inputRef.current?.click()}><Icon>▤</Icon>Browse files</button><small>PDF or DOCX · Max 5 MB</small></div>
                      )}
                    </div>
                    <p className="analyzer-card-note"><span aria-hidden="true">◇</span>{settings?.resumeStorageEnabled ? 'Your original resume is saved in private file storage.' : 'Your resume is processed in memory and discarded after analysis.'}</p>
                  </section>

                  <section className="analyzer-card job-description-card" aria-labelledby="job-description-heading">
                    <div className="analyzer-card-heading"><span className="analyzer-step-number">02</span><div><h2 id="job-description-heading">Add the job description</h2><p>Paste the role you want to compare against.</p></div></div>
                    <div className="job-description-input">
                      <textarea value={jd} maxLength={20000} onChange={(event) => setJd(event.target.value)} placeholder="Paste the job description here. Include responsibilities, qualifications, and required skills for the most useful comparison." />
                      <span>{jd.length.toLocaleString()} / 20,000 characters</span>
                    </div>
                    <p className="analyzer-card-note"><span aria-hidden="true">✦</span>We’ll compare the role’s requirements with evidence in your resume.</p>
                  </section>
                </div>
                {error && <div className="analyzer-error" role="alert"><span aria-hidden="true">!</span>{error}</div>}
                <div className="analyzer-submit-row">
                  <div className="analyzer-submit-note"><span aria-hidden="true">◇</span><div><strong>Private by account</strong><small>{settings?.aiProvider === 'mock' || !settings?.aiProvider ? 'Resume text stays with this application.' : `Resume text is shared with ${settings.aiProvider} for analysis.`}</small></div></div>
                  <button className="analyze analyzer-submit" onClick={analyze} disabled={status === 'analyzing'}><Icon>✦</Icon>{status === 'analyzing' ? 'Analyzing your resume…' : 'Analyze resume'}</button>
                </div>
              </section>
              {result && analysis && <section className="panel result-preview">
                <div className="panel-heading"><div><h2>Latest Analysis</h2><p>{analysis.summary}</p></div><button onClick={() => setPage('report')}>Detailed report →</button></div>
                <div className="analysis-summary"><div className="score"><strong>{analysis.coverage}%</strong><span>Coverage</span></div><ul>{analysis.requirements?.slice(0, 5).map((item) => <li key={item.requirement}><b>{item.status === 'matched' ? '✓' : '△'}</b><span>{item.requirement} · {item.status}</span></li>)}</ul></div>
              </section>}
              <section className="analyzer-benefits"><div><span className="benefit-icon" aria-hidden="true">✓</span><span><strong>Evidence-backed</strong><small>See what matches your resume</small></span></div><div><span className="benefit-icon" aria-hidden="true">◇</span><span><strong>Private by account</strong><small>Your reports belong to you</small></span></div><div><span className="benefit-icon" aria-hidden="true">↗</span><span><strong>Actionable feedback</strong><small>Get practical next steps</small></span></div></section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
