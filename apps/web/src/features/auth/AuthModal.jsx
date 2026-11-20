import { useEffect } from 'react'

export default function AuthModal({
  mode,
  form,
  setForm,
  error,
  loading,
  googleButtonRef,
  googleClientId,
  onSubmit,
  onClose,
  onToggleMode,
}) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="auth-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-heading">
        <button className="auth-modal-close" type="button" aria-label="Close sign-in dialog" onClick={onClose}>×</button>
        <div className="auth-mobile-brand"><div className="brand-mark">✦</div><strong>AI Resume Analyzer</strong></div>
        <div className="auth-heading">
          <p className="auth-kicker">{mode === 'login' ? 'YOUR PRIVATE WORKSPACE' : 'GET STARTED'}</p>
          <h1 id="auth-modal-heading">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p>{mode === 'login' ? 'Sign in to save your reports and profile.' : 'Create an account to keep your analyses.'}</p>
        </div>
        <form className="auth-modal-form" onSubmit={onSubmit}>
          {mode === 'register' && <label>Name<input required maxLength="100" autoComplete="name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label>}
          <label>Email address<input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Password<input type="password" required minLength="8" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="analyze auth-submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<span aria-hidden="true">→</span></button>
        </form>
        {mode === 'login' && <>
          <div className="auth-divider"><span>OR</span></div>
          {googleClientId
            ? <div className="google-login-button" ref={googleButtonRef} />
            : <p className="google-setup-note">Google sign-in can be enabled in the application configuration.</p>}
        </>}
        <button className="auth-toggle" type="button" onClick={onToggleMode}>
          {mode === 'login' ? <>New to the analyzer? <strong>Create an account</strong></> : <>Already have an account? <strong>Sign in</strong></>}
        </button>
        <p className="auth-privacy-note"><span aria-hidden="true">◇</span> Your reports are private to your account.</p>
      </section>
    </div>
  )
}
