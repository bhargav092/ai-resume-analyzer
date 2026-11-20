import Icon from '../../shared/ui/Icon'

export default function DashboardPage({
  inputRef,
  file,
  jd,
  setJd,
  status,
  error,
  setError,
  settings,
  isGuest,
  validateFile,
  analyze,
  result,
  analysis,
  setPage,
}) {
  return (
    <>
      <section className="analyzer-page">
        <header className="analyzer-intro">
          <div><p className="analyzer-kicker">{isGuest ? 'GUEST WORKSPACE' : 'AI-POWERED CAREER TOOL'}</p><h1>Align your resume with <span>the role.</span></h1><p>Upload your resume and a job description to get clear, evidence-based feedback.</p></div>
          <div className="analyzer-intro-badge"><span aria-hidden="true">✦</span> Resume insights</div>
        </header>
        {isGuest && <div className="guest-notice" role="status">Guest workspace · Your analyses are isolated to this browser and expire after 30 days.</div>}
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
            <p className="analyzer-card-note"><span aria-hidden="true">◇</span>{isGuest ? 'Guest uploads are processed in memory and discarded after analysis.' : settings?.resumeStorageEnabled ? 'Your original resume is saved in private file storage.' : 'Your resume is processed in memory and discarded after analysis.'}</p>
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
          <div className="analyzer-submit-note"><span aria-hidden="true">◇</span><div><strong>{isGuest ? 'Demo analysis' : 'Private by account'}</strong><small>{isGuest || settings?.aiProvider === 'mock' || !settings?.aiProvider ? 'Resume text stays with this application.' : `Resume text is shared with ${settings.aiProvider} for analysis.`}</small></div></div>
          <button className="analyze analyzer-submit" onClick={analyze} disabled={status === 'analyzing'}><Icon>✦</Icon>{status === 'analyzing' ? 'Analyzing your resume…' : 'Analyze resume'}</button>
        </div>
      </section>
      {result && analysis && <section className="panel result-preview">
        <div className="panel-heading"><div><h2>Latest Analysis</h2><p>{analysis.summary}</p></div><button onClick={() => setPage('report')}>Detailed report →</button></div>
        <div className="analysis-summary"><div className="score"><strong>{analysis.coverage}%</strong><span>Coverage</span></div><ul>{analysis.requirements?.slice(0, 5).map((item) => <li key={item.requirement}><b>{item.status === 'matched' ? '✓' : '△'}</b><span>{item.requirement} · {item.status}</span></li>)}</ul></div>
      </section>}
      <section className="analyzer-benefits"><div><span className="benefit-icon" aria-hidden="true">✓</span><span><strong>Evidence-backed</strong><small>See what matches your resume</small></span></div><div><span className="benefit-icon" aria-hidden="true">◇</span><span><strong>{isGuest ? 'Isolated workspace' : 'Private by account'}</strong><small>{isGuest ? 'Only this browser can access these reports' : 'Your reports belong to you'}</small></span></div><div><span className="benefit-icon" aria-hidden="true">↗</span><span><strong>Actionable feedback</strong><small>Get practical next steps</small></span></div></section>
    </>
  )
}
