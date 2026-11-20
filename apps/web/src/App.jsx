import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001' })
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const Icon = ({ children }) => <span className="icon" aria-hidden="true">{children}</span>
const subscriptionPlans = [
  { id: 'week', duration: '7 days', price: 99 },
  { id: 'month', duration: '1 month', price: 199 },
  { id: 'quarter', duration: '3 months', price: 299, featured: true },
  { id: 'year', duration: '1 year', price: 499 },
]
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const getUserInitials = (displayName, email) => {
  const name = displayName?.trim() || email?.split('@')[0] || 'U'
  const parts = name.split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)).toUpperCase()
}
const trialTimeLeft = (endsAt) => {
  const hours = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / (60 * 60 * 1000)))
  return hours >= 24 ? '1 day left' : `${hours} ${hours === 1 ? 'hour' : 'hours'} left`
}

export default function App() {
  const inputRef = useRef(null)
  const activityRef = useRef(null)
  const userMenuRef = useRef(null)
  const googleButtonRef = useRef(null)
  const sessionVersionRef = useRef(0)
  const [token, setToken] = useState(() => sessionStorage.getItem('accessToken'))
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('resume-analyzer-theme') === 'dark' ? 'dark' : 'light')
  const [activityOpen, setActivityOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [subscriptionOpen, setSubscriptionOpen] = useState(false)
  const [buyingPlan, setBuyingPlan] = useState('')
  const [subscriptionError, setSubscriptionError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('quarter')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [qrPayment, setQrPayment] = useState(null)
  const [countdown, setCountdown] = useState(120)
  const [notificationWarning, setNotificationWarning] = useState('')
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

  const handleGoogleCredential = useCallback(async (credential) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const { data } = await api.post('/auth/google', { credential })
      sessionStorage.setItem('accessToken', data.accessToken)
      setToken(data.accessToken)
      setUser(data.user)
      setNotificationWarning(data.notificationWarning || '')
      setAuthForm({ email: '', password: '', displayName: '' })
    } catch (requestError) {
      setAuthError(requestError.response?.data?.message || 'Google sign-in failed. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }, [])

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

  useEffect(() => {
    if (token || authMode !== 'login' || !googleClientId || !googleButtonRef.current) return
    let active = true
    const renderGoogleButton = () => {
      if (!active || !window.google?.accounts?.id || !googleButtonRef.current) return
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => {
          if (credential) handleGoogleCredential(credential)
          else setAuthError('Google did not return a sign-in credential.')
        },
      })
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: theme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: Math.min(320, googleButtonRef.current.clientWidth || 320),
      })
    }
    if (window.google?.accounts?.id) {
      renderGoogleButton()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = renderGoogleButton
      script.onerror = () => setAuthError('Google sign-in could not load. Check your internet connection.')
      document.head.appendChild(script)
    }
    return () => { active = false }
  }, [token, authMode, theme, handleGoogleCredential])

  useEffect(() => {
    if (!subscriptionOpen) return
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        if (user?.id && !subscription?.accessActive) {
          sessionStorage.setItem(`subscription-dismissed-${user.id}`, 'true')
        }
        setSubscriptionOpen(false)
        setSubscriptionError('')
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [subscriptionOpen, subscription?.accessActive, user?.id])

  const clearSession = () => {
    sessionVersionRef.current += 1
    if (user?.id) sessionStorage.removeItem(`subscription-dismissed-${user.id}`)
    sessionStorage.removeItem('accessToken')
    setToken(null)
    setUser(null)
    setHistory([])
    setResult(null)
    setSettings(null)
    setSubscription(null)
    setSubscriptionOpen(false)
    setBuyingPlan('')
    setSubscriptionError('')
    setQrPayment(null)
    setNotificationWarning('')
    setFile(null)
    setJd('')
    setStatus('idle')
    setError('')
    setBusyId('')
    setPage('dashboard')
    setAuthMode('login')
    setAuthForm({ email: '', password: '', displayName: '' })
    setAuthError('')
    setAuthLoading(false)
    setActivityOpen(false)
    setUserMenuOpen(false)
  }

  const loadHistory = async () => {
    const requestVersion = sessionVersionRef.current
    try {
      const { data } = await api.get('/analyses')
      if (requestVersion === sessionVersionRef.current) setHistory(data)
    } catch (requestError) {
      if (requestVersion !== sessionVersionRef.current) return
      if (requestError.response?.status === 401) clearSession()
      throw requestError
    }
  }

  const createQrPayment = async () => {
    setSubscriptionError('')
    setQrPayment(null)
    setBuyingPlan('qr')
    try {
      const { data } = await api.post('/subscriptions/qr-codes', { planId: selectedPlan })
      setQrPayment(data)
      setCountdown(Math.max(0, Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / 1000)))
    } catch (requestError) {
      setSubscriptionError(requestError.response?.data?.message || 'Could not create a Razorpay QR payment request.')
    } finally {
      setBuyingPlan('')
    }
  }

  useEffect(() => {
    if (!qrPayment?.id || qrPayment.status !== 'pending') return
    const timer = window.setInterval(() => {
      const secondsLeft = Math.max(0, Math.ceil((new Date(qrPayment.expiresAt).getTime() - Date.now()) / 1000))
      setCountdown(secondsLeft)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [qrPayment?.id, qrPayment?.expiresAt, qrPayment?.status])

  useEffect(() => {
    if (!qrPayment?.id || qrPayment.status !== 'pending') return
    let active = true
    let requestInFlight = false
    const pollStatus = async () => {
      if (requestInFlight) return
      requestInFlight = true
      try {
        const { data } = await api.get(`/subscriptions/qr-codes/${qrPayment.id}/status`)
        if (!active) return
        setSubscriptionError('')
        if (data.paymentStatus === 'completed') {
          setQrPayment((current) => current ? { ...current, status: 'completed' } : current)
          setSubscription(data)
          setNotificationWarning(data.notificationWarning || '')
          sessionStorage.removeItem(`subscription-dismissed-${user?.id}`)
        } else {
          setQrPayment((current) => current ? { ...current, status: data.paymentStatus } : current)
        }
      } catch {
        if (active) setSubscriptionError('Could not refresh the Razorpay payment status. Retrying…')
      } finally {
        requestInFlight = false
      }
    }
    pollStatus()
    const timer = window.setInterval(pollStatus, 3000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [qrPayment?.id, qrPayment?.status, user?.id])

  useEffect(() => {
    if (!token) return
    let active = true
    Promise.all([api.get('/auth/me'), api.get('/analyses'), api.get('/auth/settings'), api.get('/subscriptions/status')])
      .then(([me, analyses, accountSettings, accountSubscription]) => {
        if (!active) return
        setUser(me.data)
        setHistory(analyses.data)
        setSettings(accountSettings.data)
        setSubscription(accountSubscription.data)
        if (!accountSubscription.data.accessActive
          && sessionStorage.getItem(`subscription-dismissed-${me.data.id}`) !== 'true') {
          setSubscriptionOpen(true)
        }
      })
      .catch((requestError) => {
        if (active && requestError.response?.status === 401) clearSession()
        else if (active) setError('Could not load your account data. Check that the API is available.')
      })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    if (!subscription?.trialActive || subscription.subscriptionActive) return
    const timer = window.setTimeout(() => {
      setSubscription((current) => current ? { ...current, trialActive: false, accessActive: false } : current)
      if (user?.id && sessionStorage.getItem(`subscription-dismissed-${user.id}`) !== 'true') {
        setSubscriptionOpen(true)
      }
    }, Math.max(0, new Date(subscription.trialEndsAt).getTime() - Date.now()))
    return () => window.clearTimeout(timer)
  }, [subscription, user?.id])

  const closeSubscription = () => {
    if (user?.id && !subscription?.accessActive) {
      sessionStorage.setItem(`subscription-dismissed-${user.id}`, 'true')
    }
    setSubscriptionOpen(false)
    setSubscriptionError('')
  }

  const openSubscriptionPage = () => {
    setSubscriptionError('')
    setSubscriptionOpen(false)
    setPage('subscription')
  }

  const startSubscription = async (planId, method = 'card') => {
    setBuyingPlan(planId)
    setSubscriptionError('')
    try {
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Could not load Razorpay checkout. Check your internet connection and try again.'))
          document.body.appendChild(script)
        })
      }
      const { data: order } = await api.post('/subscriptions/orders', { planId, method })
      const blockId = method === 'card' ? 'cards_only' : 'upi_only'
      const checkoutMethod = method === 'card' ? 'card' : 'upi'
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'AI Resume Analyzer',
        description: `${planId === 'week' ? '7 days' : planId === 'month' ? '1 month' : planId === 'quarter' ? '3 months' : '1 year'} subscription`,
        order_id: order.orderId,
        prefill: { name: user?.displayName, email: user?.email },
        config: {
          display: {
            blocks: { [blockId]: { name: method === 'card' ? 'Pay by card' : 'Pay by UPI', instruments: [{ method: checkoutMethod }] } },
            sequence: [`block.${blockId}`],
            preferences: { show_default_blocks: false },
          },
        },
        theme: { color: '#655af1' },
        handler: async (payment) => {
          setBuyingPlan(planId)
          try {
            const { data } = await api.post('/subscriptions/verify', payment)
            setSubscription(data)
            setNotificationWarning(data.notificationWarning || '')
            sessionStorage.removeItem(`subscription-dismissed-${user?.id}`)
            setSubscriptionOpen(false)
            setPage('subscription')
          } catch (requestError) {
            setSubscriptionError(requestError.response?.data?.message || 'Payment may have been received, but confirmation failed. Check your payment status before trying again.')
          } finally {
            setBuyingPlan('')
          }
        },
      })
      checkout.on('payment.failed', (event) => {
        setSubscriptionError(event.error?.description || 'Payment failed. Please try again.')
      })
      checkout.open()
      setBuyingPlan('')
    } catch (requestError) {
      setSubscriptionError(requestError.response?.data?.message || requestError.message || 'Could not start the subscription checkout.')
      setBuyingPlan('')
    }
  }

  const submitAuth = async (event) => {
    event.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      const { data } = await api.post(`/auth/${authMode === 'register' ? 'register' : 'login'}`, authForm)
      sessionStorage.setItem('accessToken', data.accessToken)
      setToken(data.accessToken)
      setUser(data.user)
      setNotificationWarning(data.notificationWarning || '')
      setAuthForm({ email: '', password: '', displayName: '' })
    } catch (requestError) {
      setAuthError(requestError.response?.data?.message || 'Authentication failed. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const validateFile = (candidate) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(candidate?.type)) {
      setFile(null)
      return 'Please upload a PDF or DOCX file.'
    }
    if (candidate.size > 5 * 1024 * 1024) {
      setFile(null)
      return 'File must be smaller than 5 MB.'
    }
    setError('')
    setFile(candidate)
    return ''
  }

  const analyze = async () => {
    setError('')
    if (!file) return setError('Please upload a resume first.')
    if (!jd.trim()) return setError('Please provide a job description.')
    const requestVersion = sessionVersionRef.current
    try {
      setStatus('analyzing')
      const form = new FormData()
      form.append('resume', file)
      form.append('jobDescription', jd)
      const { data } = await api.post('/analyses', form)
      if (requestVersion !== sessionVersionRef.current) return
      setResult(data)
      setStatus('complete')
      setPage('dashboard')
      loadHistory().catch((requestError) => {
        if (requestError.response?.status !== 401) setError('Analysis saved, but history could not be refreshed.')
      })
    } catch (requestError) {
      if (requestVersion !== sessionVersionRef.current) return
      if (requestError.response?.status === 401) {
        clearSession()
        return
      }
      setStatus('failed')
      setError(requestError.response?.data?.message || 'The analysis could not be completed.')
    }
  }

  const openAnalysis = async (id) => {
    const requestVersion = sessionVersionRef.current
    setBusyId(id)
    try {
      const { data } = await api.get(`/analyses/${id}`)
      if (requestVersion !== sessionVersionRef.current) return
      setResult(data)
      setStatus('complete')
      setPage('report')
    } catch (requestError) {
      if (requestVersion !== sessionVersionRef.current) return
      if (requestError.response?.status === 401) {
        clearSession()
        return
      }
      setError(requestError.response?.data?.message || 'Could not load this report.')
    } finally {
      if (requestVersion === sessionVersionRef.current) setBusyId('')
    }
  }

  const deleteAnalysis = async (id) => {
    if (!window.confirm('Delete this analysis and its stored resume, if available?')) return
    const requestVersion = sessionVersionRef.current
    setBusyId(id)
    try {
      await api.delete(`/analyses/${id}`)
      if (requestVersion !== sessionVersionRef.current) return
      setHistory((items) => items.filter((item) => item.id !== id))
      if (result?.id === id || result?._id === id) {
        setResult(null)
        setPage('dashboard')
      }
    } catch (requestError) {
      if (requestVersion !== sessionVersionRef.current) return
      if (requestError.response?.status === 401) {
        clearSession()
        return
      }
      setError(requestError.response?.data?.message || 'Could not delete this analysis.')
    } finally {
      if (requestVersion === sessionVersionRef.current) setBusyId('')
    }
  }

  const exportAnalysis = async (id) => {
    const requestVersion = sessionVersionRef.current
    try {
      const { data } = await api.get(`/analyses/${id}/export`)
      if (requestVersion !== sessionVersionRef.current) return
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `resume-analysis-${id}.json`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (requestError) {
      if (requestVersion !== sessionVersionRef.current) return
      if (requestError.response?.status === 401) {
        clearSession()
        return
      }
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
            {authMode === 'login' && (googleClientId
              ? <div className="google-login-button" ref={googleButtonRef} />
              : <p className="google-setup-note">Google sign-in is ready to configure. Add VITE_GOOGLE_CLIENT_ID to the web environment and GOOGLE_CLIENT_ID to the API.</p>)}
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
          <button className={`nav ${page === 'dashboard' ? 'active' : ''}`} aria-label="Dashboard" onClick={() => setPage('dashboard')}><Icon>▦</Icon><span className="nav-label">Dashboard</span></button>
          <button className={`nav ${page === 'history' ? 'active' : ''}`} aria-label="My History" onClick={() => setPage('history')}><Icon>◷</Icon><span className="nav-label">My History</span></button>
          <button className={`nav ${page === 'profile' ? 'active' : ''}`} aria-label="Profile" onClick={() => setPage('profile')}><Icon>♙</Icon><span className="nav-label">Profile</span></button>
          <button className={`nav ${page === 'settings' ? 'active' : ''}`} aria-label="Settings" onClick={() => setPage('settings')}><Icon>⚙</Icon><span className="nav-label">Settings</span></button>
          <button className={`nav subscription-nav ${page === 'subscription' ? 'active' : ''}`} type="button" aria-label="Subscription" onClick={openSubscriptionPage} title="Subscription"><Icon>♢</Icon><span className="nav-label">Subscription</span></button>
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
            <button className={`topbar-subscription-button ${page === 'subscription' ? 'active' : ''}`} type="button" aria-label="Open subscription" onClick={openSubscriptionPage}>
              <span aria-hidden="true">♢</span><span className="subscription-label">Subscription</span>
            </button>
            <div className="user-menu-wrap" ref={userMenuRef}>
              <button className={`account-trigger ${userMenuOpen ? 'is-open' : ''}`} type="button" aria-label={`Account options for ${user?.displayName || user?.email || 'user'}`} aria-expanded={userMenuOpen} aria-controls="account-menu" title="Account menu" onClick={() => { setActivityOpen(false); setUserMenuOpen((open) => !open) }}>
                <span className="avatar-shell"><span className="avatar">{getUserInitials(user?.displayName, user?.email)}</span><i className="avatar-status" aria-hidden="true" /></span>
                <span className="account-trigger-copy"><strong>{user?.displayName || 'Your account'}</strong><small>{user?.email || 'Account details'}</small></span>
                <svg className="account-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" /></svg>
              </button>
              {userMenuOpen && <div className="user-menu" id="account-menu" role="region" aria-label="Account navigation">
                <div className="user-menu-summary"><div className="user-menu-avatar">{getUserInitials(user?.displayName, user?.email)}</div><div><strong>{user?.displayName || 'Your account'}</strong><small>{user?.email || 'Loading account details…'}</small></div></div>
                <div className="user-menu-divider" />
                <button type="button" onClick={() => { setPage('profile'); setUserMenuOpen(false) }}><span aria-hidden="true">♙</span><span>My profile</span><b aria-hidden="true">→</b></button>
                <button type="button" onClick={() => { setPage('settings'); setUserMenuOpen(false) }}><span aria-hidden="true">⚙</span><span>Settings</span><b aria-hidden="true">→</b></button>
                <div className="user-menu-divider" />
                <button type="button" className="user-menu-signout" onClick={() => { setUserMenuOpen(false); clearSession() }}><span aria-hidden="true">↪</span><span>Sign out</span></button>
              </div>}
            </div>
            <button className="theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-pressed={theme === 'dark'} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span></button>
          </div>
        </header>

        <div className="content">
          {notificationWarning && <div className="notification-warning" role="status">{notificationWarning}<button type="button" aria-label="Dismiss notification" onClick={() => setNotificationWarning('')}>×</button></div>}
          {page === 'subscription' ? (
            <section className="subscription-page">
              <header className="subscription-page-heading">
                <div><p className="subscription-kicker">MEMBERSHIP & BILLING</p><h1>Choose your subscription</h1><p>Keep your resume workspace ready whenever a new opportunity comes along.</p></div>
                <div className={`subscription-status-badge ${subscription?.accessActive ? 'is-active' : 'is-expired'}`}><i />{subscription?.subscriptionActive ? 'Subscription active' : subscription?.trialActive ? `Free trial · ${trialTimeLeft(subscription.trialEndsAt)}` : 'Free trial ended'}</div>
              </header>
              {subscription?.subscriptionActive && <div className="subscription-active-banner"><span aria-hidden="true">✓</span><div><strong>You’re subscribed</strong><small>Active until {new Date(subscription.subscriptionEndsAt).toLocaleDateString()}</small></div></div>}
              <div className="subscription-page-grid">
                <section className="subscription-selection-card" aria-labelledby="plan-selection-heading">
                  <div className="subscription-section-heading"><div><h2 id="plan-selection-heading">Select a plan</h2><p>All prices are in Indian rupees (INR).</p></div><span className="subscription-secure-label">◇ Secure checkout</span></div>
                  <div className="subscription-plan-grid">
                    {subscriptionPlans.map((plan) => <button className={`subscription-choice ${selectedPlan === plan.id ? 'selected' : ''} ${plan.featured ? 'featured' : ''}`} type="button" key={plan.id} aria-pressed={selectedPlan === plan.id} onClick={() => { setSelectedPlan(plan.id); setQrPayment(null) }}>
                      {plan.featured && <span className="subscription-choice-badge">BEST VALUE</span>}
                      <span className="subscription-choice-radio" aria-hidden="true">{selectedPlan === plan.id ? '✓' : ''}</span>
                      <strong>{plan.duration}</strong>
                      <span className="subscription-choice-price">₹{plan.price}<small> / plan</small></span>
                    </button>)}
                  </div>
                  <div className="payment-method-section">
                    <div className="subscription-section-heading"><div><h2>Payment method</h2><p>Choose how you’d like to pay.</p></div></div>
                    <div className="payment-method-options" role="group" aria-label="Payment method">
                      <button type="button" className={paymentMethod === 'card' ? 'selected' : ''} aria-pressed={paymentMethod === 'card'} onClick={() => { setPaymentMethod('card'); setQrPayment(null) }}><span aria-hidden="true">▰</span><strong>Card</strong><small>Razorpay</small></button>
                      <button type="button" className={paymentMethod === 'upi' ? 'selected' : ''} aria-pressed={paymentMethod === 'upi'} onClick={() => { setPaymentMethod('upi'); setQrPayment(null) }}><span aria-hidden="true">↗</span><strong>UPI</strong><small>Razorpay</small></button>
                      <button type="button" className={paymentMethod === 'qr' ? 'selected' : ''} aria-pressed={paymentMethod === 'qr'} onClick={() => { setPaymentMethod('qr'); setQrPayment(null) }}><span aria-hidden="true">▦</span><strong>QR pay</strong><small>Razorpay</small></button>
                    </div>
                    {paymentMethod === 'card' ? (
                      <div className="payment-action-panel">
                        <div className="payment-action-copy"><span className="payment-provider-mark">R</span><div><strong>Pay securely with Razorpay</strong><small>Card details are entered only in Razorpay Checkout.</small></div></div>
                        {!subscription?.razorpayKeyId && <p className="subscription-setup-note">Card checkout needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the API environment.</p>}
                        <button className="subscription-pay-button" type="button" disabled={!subscription?.razorpayKeyId || Boolean(buyingPlan)} onClick={() => startSubscription(selectedPlan, 'card')}>{buyingPlan ? 'Opening secure checkout…' : `Pay ₹${subscriptionPlans.find((plan) => plan.id === selectedPlan)?.price} with Razorpay`}</button>
                      </div>
                    ) : paymentMethod === 'upi' ? (
                      <div className="payment-action-panel">
                        <div className="payment-action-copy"><span className="payment-provider-mark">R</span><div><strong>Pay with UPI via Razorpay</strong><small>Continue to Razorpay Checkout to use a supported UPI app.</small></div></div>
                        {!subscription?.razorpayKeyId && <p className="subscription-setup-note">UPI checkout needs Razorpay API credentials configured on the API.</p>}
                        <button className="subscription-pay-button" type="button" disabled={!subscription?.razorpayKeyId || Boolean(buyingPlan)} onClick={() => startSubscription(selectedPlan, 'upi')}>{buyingPlan ? 'Opening secure checkout…' : `Pay ₹${subscriptionPlans.find((plan) => plan.id === selectedPlan)?.price} with UPI`}</button>
                      </div>
                    ) : (
                      <div className="qr-payment-panel">
                        {qrPayment ? (
                          <div className={`qr-payment-details ${qrPayment.status === 'expired' ? 'expired' : ''}`}>
                            {qrPayment.status === 'completed'
                              ? <div className="qr-payment-success"><span aria-hidden="true">✓</span><strong>Payment verified</strong><small>Your subscription is active.</small></div>
                              : <>
                                {qrPayment.status === 'pending' && <img className="razorpay-payment-qr" src={qrPayment.imageUrl} alt="Razorpay UPI payment QR code" />}
                                <strong>{qrPayment.status === 'expired' ? 'QR code expired' : qrPayment.status === 'failed' ? 'QR code could not be created' : `₹${(qrPayment.amountPaise / 100).toFixed(2)} · ${countdown}s remaining`}</strong>
                                {qrPayment.status === 'pending' && <span>Scan with a UPI app to pay securely.</span>}
                                {qrPayment.status === 'expired' && <button className="subscription-pay-button" type="button" onClick={createQrPayment}>Generate a new QR code</button>}
                              </>}
                          </div>
                        ) : (
                          <>
                            <div className="payment-action-copy"><span className="payment-provider-mark">R</span><div><strong>Razorpay UPI QR</strong><small>A single-use QR code for the selected plan.</small></div></div>
                            {!subscription?.razorpayKeyId && <p className="subscription-setup-note">QR payments need Razorpay API credentials configured on the API.</p>}
                            <button className="subscription-pay-button" type="button" disabled={!subscription?.razorpayKeyId || Boolean(buyingPlan)} onClick={createQrPayment}>Generate secure QR code</button>
                          </>
                        )}
                      </div>
                    )}
                    {subscriptionError && <p className="subscription-error" role="alert">{subscriptionError}</p>}
                    <p className="subscription-security">Payments are verified with Razorpay before your subscription is activated. Razorpay QR Codes must be enabled for your merchant account.</p>
                  </div>
                </section>
                <aside className="subscription-summary-card">
                  <div className="summary-card-top"><span aria-hidden="true">✦</span><p>YOUR SUBSCRIPTION</p><h2>Resume insights, on your terms.</h2><small>Secure your workspace and keep your saved reports close.</small></div>
                  <div className="summary-selected-plan"><span>{subscriptionPlans.find((plan) => plan.id === selectedPlan)?.duration} plan</span><strong>₹{subscriptionPlans.find((plan) => plan.id === selectedPlan)?.price}</strong></div>
                  <ul><li><span>✓</span>Personal resume analysis workspace</li><li><span>✓</span>Saved reports and history</li><li><span>✓</span>Actionable role-matching insights</li></ul>
                  <p className="summary-cancel-note">One-time payment for the selected period. No recurring auto-renewal.</p>
                </aside>
              </div>
            </section>
          ) : page === 'history' ? (
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
                    <div className="profile-identity-top"><div className="profile-avatar">{getUserInitials(user?.displayName, user?.email)}</div><span className="profile-active"><i /> Signed in</span></div>
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
                    <div className="settings-account-top"><div className="settings-large-avatar">{getUserInitials(user?.displayName, user?.email)}</div><span className="account-status"><i /> Active</span></div>
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
                      <input ref={inputRef} hidden type="file" accept=".pdf,.docx" onChange={(event) => {
                        const candidate = event.target.files?.[0]
                        event.target.value = ''
                        setError(validateFile(candidate))
                      }} />
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
      {subscriptionOpen && <div className="subscription-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget && subscription?.accessActive) closeSubscription()
      }}>
        <section className="subscription-dialog" role="dialog" aria-modal="true" aria-labelledby="subscription-title">
          <button className="subscription-close" type="button" aria-label="Close subscription" onClick={closeSubscription}>×</button>
          <div className="subscription-symbol" aria-hidden="true">♢</div>
          <p className="subscription-kicker">{subscription?.subscriptionActive ? 'YOUR PLAN' : subscription?.trialActive ? 'FREE TRIAL' : 'TRIAL ENDED'}</p>
          <h2 id="subscription-title">{subscription?.subscriptionActive ? 'Subscription active' : subscription?.trialActive ? 'Enjoy your free day' : 'Keep your resume insights going'}</h2>
          <p className="subscription-description">{subscription?.subscriptionActive
            ? `Your subscription is active until ${new Date(subscription.subscriptionEndsAt).toLocaleDateString()}.`
            : subscription?.trialActive
              ? `You have ${trialTimeLeft(subscription.trialEndsAt)} on your free trial. Choose a plan whenever you’re ready.`
              : 'Your 24-hour free trial has ended. Select a plan below to activate a subscription.'}</p>
          {subscriptionError && <p className="subscription-error" role="alert">{subscriptionError}</p>}
          <button className="subscription-pay-button subscription-modal-cta" type="button" onClick={() => { setSubscriptionOpen(false); setPage('subscription') }}>View payment options <span aria-hidden="true">→</span></button>
          <button className="subscription-later" type="button" onClick={closeSubscription}>{subscription?.accessActive ? 'Maybe later' : 'Continue to workspace'}</button>
          <p className="subscription-security">Card payments verified by Razorpay · Demo QR/UPI are not real payments</p>
        </section>
      </div>}
    </div>
  )
}
