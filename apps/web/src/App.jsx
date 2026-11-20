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
  const [token, setToken] = useState(() => sessionStorage.getItem('accessToken'))
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('resume-analyzer-theme') === 'dark' ? 'dark' : 'light')
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
        <form className="auth-card" onSubmit={submitAuth}>
          <div className="brand-mark">✦</div>
          <h1>AI Resume Analyzer</h1>
          <p>{authMode === 'login' ? 'Sign in to analyze and manage your reports.' : 'Create your private workspace to get started.'}</p>
          {authMode === 'register' && <label>Name<input required maxLength="100" value={authForm.displayName} onChange={(event) => setAuthForm({ ...authForm, displayName: event.target.value })} /></label>}
          <label>Email<input type="email" required autoComplete="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
          <label>Password<input type="password" required minLength="8" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
          {authError && <p className="error">{authError}</p>}
          <button className="analyze auth-submit" disabled={authLoading}>{authLoading ? 'Please wait…' : authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
          <button className="auth-toggle" type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}>
            {authMode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}
          </button>
        </form>
      </main>
    )
  }

  const analysis = result?.result || result

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
          <button className="logout" onClick={clearSession}>↪ Sign out</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div><button className="bell" aria-label="Notifications">♧</button><div className="avatar">{(user?.displayName || user?.email || 'U').slice(0, 2).toUpperCase()}</div><button className="theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-pressed={theme === 'dark'} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span></button><strong>{user?.displayName || user?.email}</strong><button className="logout-top" onClick={clearSession}>Sign out</button></div>
        </header>

        <div className="content">
          {page === 'history' ? (
            <section className="panel history-page">
              <div className="panel-heading"><div><h1>Analysis History</h1><p>Your saved resume analyses</p></div><button onClick={() => { setPage('dashboard'); setResult(null) }}>+ New analysis</button></div>
              {history.length === 0 ? <p className="empty-state">No saved analyses yet. Upload a resume to get started.</p> : history.map((item) => (
                <div className="history-row" key={item.id}>
                  <div className="doc">▤</div>
                  <button className="history-title" onClick={() => openAnalysis(item.id)} disabled={busyId === item.id}><strong>{item.title}</strong><small>{item.resumeFilename} · {new Date(item.createdAt).toLocaleString()}</small></button>
                  <b className="history-score">{item.coverage}% coverage</b>
                  <button onClick={() => exportAnalysis(item.id)} aria-label="Export report">Export</button>
                  <button onClick={() => deleteAnalysis(item.id)} disabled={busyId === item.id} aria-label="Delete report">Delete</button>
                </div>
              ))}
            </section>
          ) : page === 'profile' ? (
            <section className="panel account-page"><h1>Your Profile</h1><p>Account details associated with your private workspace.</p><dl><dt>Name</dt><dd>{user?.displayName}</dd><dt>Email</dt><dd>{user?.email}</dd><dt>Account ID</dt><dd>{user?.id}</dd></dl></section>
          ) : page === 'settings' ? (
            <section className="panel account-page"><h1>Privacy & Settings</h1><p>These controls apply to your account’s resume-analysis data.</p><dl><dt>Analysis retention</dt><dd>{settings?.analysisRetentionDays ?? 90} days; you can delete reports earlier from Analysis History.</dd><dt>Original resume storage</dt><dd>{settings?.resumeStorageEnabled ? 'Stored in the configured private S3 bucket.' : 'Not retained; the uploaded file is processed in memory only.'}</dd><dt>Analysis provider</dt><dd>{settings?.aiProvider === 'mock' ? 'Local keyword-matching provider.' : `${settings?.aiProvider} receives extracted resume text and the job description to generate the report.`}</dd><dt>Session</dt><dd>Access token is kept in this browser tab and expires after one hour.</dd></dl></section>
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
              <section className="heading">
                <div><h1><span>AI</span> Resume Analyzer</h1><p>Upload your <b>resume</b> and get <b>instant</b> AI-powered insights<br />on your skills, strengths and areas for improvement.</p></div>
                <div className="hero-art" aria-hidden="true"><div className="document">♙<i /><i /><i /></div><div className="ai">AI</div></div>
              </section>
              <section className="input-grid">
                <div className="upload-card" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                  event.preventDefault()
                  const candidate = event.dataTransfer.files[0]
                  setError(validateFile(candidate))
                }}>
                  <input ref={inputRef} hidden type="file" accept=".pdf,.docx" onChange={(event) => setError(validateFile(event.target.files[0]))} />
                  <div className="upload-mark">⇧</div><h2>{file?.name || 'Upload Your Resume'}</h2>
                  <p>{file ? 'Ready to analyze' : 'Drag & drop your file here or click to browse'}<br /><small>Supports PDF, DOCX (Max 5MB)</small></p>
                  <button className="choose" onClick={() => inputRef.current?.click()}><Icon>▤</Icon>{file ? 'Change File' : 'Choose File'}</button>
                </div>
                <div className="jd-card"><h2>Analyze with a Job Description</h2><p>Paste a job description to get tailored, evidence-based feedback</p>
                  <textarea value={jd} maxLength={20000} onChange={(event) => setJd(event.target.value)} placeholder="Paste job description here..." />
                  {error && <div className="error">{error}</div>}
                  <button className="analyze" onClick={analyze} disabled={status === 'analyzing'}><Icon>✦</Icon>{status === 'analyzing' ? 'Analyzing...' : 'Analyze Resume'}</button>
                </div>
              </section>
              {result && analysis && <section className="panel result-preview">
                <div className="panel-heading"><div><h2>Latest Analysis</h2><p>{analysis.summary}</p></div><button onClick={() => setPage('report')}>Detailed report →</button></div>
                <div className="analysis-summary"><div className="score"><strong>{analysis.coverage}%</strong><span>Coverage</span></div><ul>{analysis.requirements?.slice(0, 5).map((item) => <li key={item.requirement}><b>{item.status === 'matched' ? '✓' : '△'}</b><span>{item.requirement} · {item.status}</span></li>)}</ul></div>
              </section>}
              <section className="benefits"><div className="benefit-main"><div>✦</div><span><strong>Powered by {settings?.aiProvider === 'mock' ? 'Local Analysis' : settings?.aiProvider || 'Advanced AI'}</strong><small>Resume text may be sent to the configured AI provider; see Privacy & Settings.</small></span></div><div><b>ϟ</b><strong>Evidence-backed</strong></div><div><b>◆</b><strong>Private by account</strong></div><div><b>⌁</b><strong>Actionable Tips</strong></div></section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
