import { useCallback, useEffect, useRef, useState } from 'react'
import AppShell from './components/layout/AppShell'
import { authenticate, authenticateWithGoogle, createGuestSession, getAccountSettings, getCurrentUser, updateAccountSettings, updateCurrentUser } from './features/auth/auth.api'
import DashboardPage from './features/dashboard/DashboardPage'
import HistoryPage from './features/analyses/HistoryPage'
import ReportPage from './features/analyses/ReportPage'
import { createAnalysis, deleteAnalysis as removeAnalysis, exportAnalysis as fetchAnalysisExport, getAnalysis, listAnalyses, updateAnalysis } from './features/analyses/analyses.api'
import ProfilePage from './features/account/ProfilePage'
import SettingsPage from './features/account/SettingsPage'
import SubscriptionPage from './features/subscriptions/SubscriptionPage'
import SubscriptionDialog from './features/subscriptions/SubscriptionDialog'
import { createQrPayment as requestQrPayment, getQrPaymentStatus, getSubscriptionStatus, createSubscriptionOrder, verifySubscriptionPayment } from './features/subscriptions/subscriptions.api'
import { getAuthErrorMessage } from './shared/lib/account'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
let guestSessionRequest

function requestGuestSessionOnce() {
  if (!guestSessionRequest) {
    guestSessionRequest = createGuestSession().finally(() => {
      guestSessionRequest = null
    })
  }
  return guestSessionRequest
}

export default function App() {
  const inputRef = useRef(null)
  const googleButtonRef = useRef(null)
  const sessionVersionRef = useRef(0)
  const [token, setToken] = useState(() => sessionStorage.getItem('accessToken') || localStorage.getItem('guestAccessToken'))
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
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', displayName: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [jd, setJd] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [bootstrapError, setBootstrapError] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [settings, setSettings] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [busyId, setBusyId] = useState('')

  const clearSession = () => {
    sessionVersionRef.current += 1
    if (user?.id) sessionStorage.removeItem(`subscription-dismissed-${user.id}`)
    sessionStorage.removeItem('accessToken')
    setToken(localStorage.getItem('guestAccessToken'))
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
    setBootstrapError('')
    setBusyId('')
    setPage('dashboard')
    setAuthMode('login')
    setAuthForm({ email: '', password: '', displayName: '' })
    setAuthError('')
    setAuthLoading(false)
    setAuthOpen(false)
    setActivityOpen(false)
    setUserMenuOpen(false)
  }

  const handleUnauthorized = (requestToken = token) => {
    if (requestToken && requestToken === localStorage.getItem('guestAccessToken')) {
      localStorage.removeItem('guestAccessToken')
      setToken(null)
      setUser(null)
      return
    }
    clearSession()
  }

  const handleGoogleCredential = useCallback(async (credential) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const { data } = await authenticateWithGoogle(credential)
      sessionVersionRef.current += 1
      sessionStorage.setItem('accessToken', data.accessToken)
      setToken(data.accessToken)
      setUser(data.user)
      setAuthOpen(false)
      setBootstrapError('')
      setNotificationWarning(data.notificationWarning || '')
      setAuthForm({ email: '', password: '', displayName: '' })
    } catch (requestError) {
      setAuthError(getAuthErrorMessage(requestError, 'Google sign-in failed. Please try again.'))
    } finally {
      setAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('resume-analyzer-theme', theme)
  }, [theme])

  useEffect(() => {
    if (token) return
    let active = true
    requestGuestSessionOnce().then(({ data }) => {
      if (!active) return
      const guestToken = data.accessToken || data.token
      if (!guestToken) throw new Error('The API did not return a guest access token.')
      localStorage.setItem('guestAccessToken', guestToken)
      setToken(guestToken)
      setUser(data.user || null)
      setBootstrapError('')
    }).catch((requestError) => {
      if (active) setBootstrapError(requestError.message || 'Could not start a guest workspace. Check that the API is available.')
    })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    if (!authOpen || authMode !== 'login' || !googleClientId || !googleButtonRef.current) return
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
  }, [authOpen, authMode, theme, handleGoogleCredential])

  useEffect(() => {
    if (!subscriptionOpen) return
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeSubscription()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [subscriptionOpen, subscription?.accessActive, user?.id])

  const loadHistory = async () => {
    const requestVersion = sessionVersionRef.current
    const requestToken = token
    try {
      const { data } = await listAnalyses()
      if (requestVersion === sessionVersionRef.current) setHistory(data)
    } catch (requestError) {
      if (requestVersion !== sessionVersionRef.current) return
      if (requestError.response?.status === 401) handleUnauthorized(requestToken)
      throw requestError
    }
  }

  const createQrPayment = async () => {
    if (user?.guest || user?.isGuest || !token) {
      openAuth('register')
      return
    }
    setSubscriptionError('')
    setQrPayment(null)
    setBuyingPlan('qr')
    try {
      const { data } = await requestQrPayment(selectedPlan)
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
        const { data } = await getQrPaymentStatus(qrPayment.id)
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
    const requestToken = token
    const isGuestToken = token === localStorage.getItem('guestAccessToken')
    Promise.all([
      getCurrentUser(),
      listAnalyses(),
      getAccountSettings(),
      isGuestToken ? Promise.resolve({ data: null }) : getSubscriptionStatus(),
    ])
      .then(([me, analyses, accountSettings, accountSubscription]) => {
        if (!active) return
        setUser(me.data)
        setHistory(analyses.data)
        setSettings(accountSettings.data)
        const accountTheme = accountSettings.data.preferences?.theme
        if (accountTheme === 'light' || accountTheme === 'dark') setTheme(accountTheme)
        setSubscription(accountSubscription.data)
        if (!isGuestToken && accountSubscription.data && !accountSubscription.data.accessActive
          && sessionStorage.getItem(`subscription-dismissed-${me.data.id}`) !== 'true') {
          setSubscriptionOpen(true)
        }
      })
      .catch((requestError) => {
        if (active && requestError.response?.status === 401) handleUnauthorized(requestToken)
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

  function closeSubscription() {
    if (user?.id && !subscription?.accessActive) {
      sessionStorage.setItem(`subscription-dismissed-${user.id}`, 'true')
    }
    setSubscriptionOpen(false)
    setSubscriptionError('')
  }

  function openSubscriptionPage() {
    setSubscriptionError('')
    setSubscriptionOpen(false)
    if (user?.guest || user?.isGuest || !token) {
      openAuth('login')
      setAuthError('Sign in or create an account to access subscriptions.')
      return
    }
    setPage('subscription')
  }

  const startSubscription = async (planId, method = 'card') => {
    if (user?.guest || user?.isGuest || !token) {
      openAuth('login')
      return
    }
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
      const { data: order } = await createSubscriptionOrder(planId, method)
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
            const { data } = await verifySubscriptionPayment(payment)
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

  const openAuth = (mode = 'login') => {
    setAuthMode(mode)
    setAuthError('')
    setAuthOpen(true)
    setUserMenuOpen(false)
  }

  const changeAuthMode = (mode) => {
    setAuthMode(mode)
    setAuthError('')
    setAuthOpen(true)
    setUserMenuOpen(false)
  }

  const submitAuth = async (event) => {
    event.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      const { data } = await authenticate(authMode === 'register' ? 'register' : 'login', authForm)
      sessionVersionRef.current += 1
      sessionStorage.setItem('accessToken', data.accessToken)
      setToken(data.accessToken)
      setUser(data.user)
      setAuthOpen(false)
      setBootstrapError('')
      setPage('dashboard')
      setNotificationWarning(data.notificationWarning || '')
      setAuthForm({ email: '', password: '', displayName: '' })
    } catch (requestError) {
      setAuthError(getAuthErrorMessage(requestError, 'Authentication failed. Please try again.'))
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
    if (!token) {
      openAuth('login')
      setAuthError('Sign in or create an account to run an analysis.')
      return
    }
    if (!file) return setError('Please upload a resume first.')
    if (!jd.trim()) return setError('Please provide a job description.')
    const requestVersion = sessionVersionRef.current
    const requestToken = token
    try {
      setStatus('analyzing')
      const form = new FormData()
      form.append('resume', file)
      form.append('jobDescription', jd)
      const { data } = await createAnalysis(form)
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
        handleUnauthorized(requestToken)
        return
      }
      setStatus('failed')
      setError(requestError.response?.data?.message || 'The analysis could not be completed.')
    }
  }

  const openAnalysis = async (id) => {
    if (user?.guest || user?.isGuest || !token) {
      openAuth('login')
      return
    }
    const requestVersion = sessionVersionRef.current
    const requestToken = token
    setBusyId(id)
    try {
      const { data } = await getAnalysis(id)
      if (requestVersion !== sessionVersionRef.current) return
      setResult(data)
      setStatus('complete')
      setPage('report')
    } catch (requestError) {
      if (requestVersion !== sessionVersionRef.current) return
      if (requestError.response?.status === 401) {
        handleUnauthorized(requestToken)
        return
      }
      setError(requestError.response?.data?.message || 'Could not load this report.')
    } finally {
      if (requestVersion === sessionVersionRef.current) setBusyId('')
    }
  }

  const renameAnalysis = async (id, title) => {
    const cleanTitle = title.trim()
    if (!cleanTitle || cleanTitle.length > 160) throw new Error('Report titles must be between 1 and 160 characters.')
    const requestVersion = sessionVersionRef.current
    const requestToken = token
    setBusyId(id)
    try {
      const { data } = await updateAnalysis(id, { title: cleanTitle })
      if (requestVersion !== sessionVersionRef.current) return
      const updated = data.analysis || data
      setHistory((items) => items.map((item) => item.id === id ? { ...item, title: updated.title || cleanTitle } : item))
      if (result?.id === id || result?._id === id) setResult((current) => ({ ...current, title: updated.title || cleanTitle }))
    } catch (requestError) {
      if (requestVersion !== sessionVersionRef.current) return
      if (requestError.response?.status === 401) {
        handleUnauthorized(requestToken)
        return
      }
      throw requestError
    } finally {
      if (requestVersion === sessionVersionRef.current) setBusyId('')
    }
  }

  const deleteAnalysis = async (id) => {
    if (!window.confirm('Delete this analysis and its stored resume, if available?')) return
    const requestVersion = sessionVersionRef.current
    const requestToken = token
    setBusyId(id)
    try {
      await removeAnalysis(id)
      if (requestVersion !== sessionVersionRef.current) return
      setHistory((items) => items.filter((item) => item.id !== id))
      if (result?.id === id || result?._id === id) {
        setResult(null)
        setPage('dashboard')
      }
    } catch (requestError) {
      if (requestVersion !== sessionVersionRef.current) return
      if (requestError.response?.status === 401) {
        handleUnauthorized(requestToken)
        return
      }
      setError(requestError.response?.data?.message || 'Could not delete this analysis.')
    } finally {
      if (requestVersion === sessionVersionRef.current) setBusyId('')
    }
  }

  const exportAnalysis = async (id) => {
    const requestVersion = sessionVersionRef.current
    const requestToken = token
    try {
      const { data } = await fetchAnalysisExport(id)
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
        handleUnauthorized(requestToken)
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

  const saveProfile = async (displayName) => {
    const requestVersion = sessionVersionRef.current
    const requestToken = token
    let response
    try {
      response = await updateCurrentUser({ displayName })
    } catch (requestError) {
      if (requestVersion === sessionVersionRef.current && requestError.response?.status === 401) {
        handleUnauthorized(requestToken)
      }
      throw requestError
    }
    if (requestVersion !== sessionVersionRef.current) return
    const { data } = response
    setUser(data.user || data)
  }

  const saveTheme = async (nextTheme) => {
    if (!token) return
    const requestVersion = sessionVersionRef.current
    const requestToken = token
    try {
      const { data } = await updateAccountSettings({ theme: nextTheme })
      if (requestVersion !== sessionVersionRef.current) return
      setSettings((current) => ({ ...current, ...data, preferences: { ...current?.preferences, ...data.preferences } }))
    } catch (requestError) {
      if (requestVersion !== sessionVersionRef.current) return
      if (requestError.response?.status === 401) {
        handleUnauthorized(requestToken)
        return
      }
      setError(requestError.response?.data?.message || 'Theme changed locally, but could not be saved to your workspace.')
    }
  }

  const analysis = result?.result || result
  const averageCoverage = history.length
    ? Math.round(history.reduce((total, item) => total + (Number(item.coverage) || 0), 0) / history.length)
    : 0
  const highestCoverage = history.reduce((highest, item) => Math.max(highest, Number(item.coverage) || 0), 0)
  const isGuest = Boolean(user?.guest || user?.isGuest || !token)
  const visibleUser = user || (isGuest ? { displayName: 'Guest', guest: true } : null)
  const navigatePage = (nextPage) => {
    if (isGuest && nextPage !== 'dashboard') {
      openAuth('login')
      return
    }
    setPage(nextPage)
  }

  let pageContent
  if (page === 'subscription' && !isGuest) {
    pageContent = <SubscriptionPage
      subscription={subscription}
      selectedPlan={selectedPlan}
      setSelectedPlan={setSelectedPlan}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      qrPayment={qrPayment}
      setQrPayment={setQrPayment}
      countdown={countdown}
      buyingPlan={buyingPlan}
      subscriptionError={subscriptionError}
      startSubscription={startSubscription}
      createQrPayment={createQrPayment}
    />
  } else if (page === 'history') {
    pageContent = isGuest ? null : <HistoryPage history={history} averageCoverage={averageCoverage} highestCoverage={highestCoverage} busyId={busyId} setPage={navigatePage} setResult={setResult} openAnalysis={openAnalysis} exportAnalysis={exportAnalysis} deleteAnalysis={deleteAnalysis} renameAnalysis={renameAnalysis} />
  } else if (page === 'profile') {
    pageContent = isGuest ? null : <ProfilePage user={user} settings={settings} onSaveProfile={saveProfile} setPage={navigatePage} />
  } else if (page === 'settings') {
    pageContent = isGuest ? null : <SettingsPage theme={theme} setTheme={setTheme} settings={settings} user={user} onSaveTheme={saveTheme} setPage={navigatePage} />
  } else if (page === 'report' && result) {
    pageContent = isGuest ? null : <ReportPage result={result} analysis={analysis} setPage={navigatePage} exportAnalysis={exportAnalysis} retryAnalysis={retryAnalysis} />
  } else {
    pageContent = <DashboardPage inputRef={inputRef} file={file} jd={jd} setJd={setJd} status={status} error={error} setError={setError} settings={settings} isGuest={isGuest} validateFile={validateFile} analyze={analyze} result={result} analysis={analysis} setPage={navigatePage} />
  }

  return (
    <>
      <AppShell
        theme={theme}
        setTheme={setTheme}
        page={page}
        setPage={setPage}
        user={visibleUser}
        history={history}
        busyId={busyId}
        openAnalysis={openAnalysis}
        openSubscriptionPage={openSubscriptionPage}
        clearSession={clearSession}
        activityOpen={activityOpen}
        setActivityOpen={setActivityOpen}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        authOpen={authOpen}
        authMode={authMode}
        authForm={authForm}
        setAuthForm={setAuthForm}
        authError={authError}
        authLoading={authLoading}
        googleButtonRef={googleButtonRef}
        googleClientId={googleClientId}
        onAuthSubmit={submitAuth}
        onAuthClose={() => { setAuthOpen(false); setAuthError('') }}
        onAuthModeChange={changeAuthMode}
      >
        {!token && <section className="guest-session-notice" role={bootstrapError ? 'alert' : 'status'}>
          <span className="guest-session-notice-icon" aria-hidden="true">{bootstrapError ? '!' : '✦'}</span>
          <div><strong>Dashboard available as guest</strong><p>{bootstrapError ? 'Sign in or create an account to continue and access the other sections.' : 'Sign in or create an account to access History, Profile, Settings, and Subscription.'}</p></div>
          <div className="guest-session-actions"><button type="button" onClick={() => openAuth('login')}>Sign in</button><button type="button" onClick={() => openAuth('register')}>Create account</button></div>
        </section>}
        {notificationWarning && <div className="notification-warning" role="status">{notificationWarning}<button type="button" aria-label="Dismiss notification" onClick={() => setNotificationWarning('')}>×</button></div>}
        {error && page !== 'dashboard' && <div className="analyzer-error" role="alert"><span aria-hidden="true">!</span>{error}<button type="button" aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}
        {pageContent}
      </AppShell>
      {subscriptionOpen && subscription && !isGuest && <SubscriptionDialog subscription={subscription} subscriptionError={subscriptionError} closeSubscription={closeSubscription} openSubscriptionPage={openSubscriptionPage} />}
    </>
  )
}
