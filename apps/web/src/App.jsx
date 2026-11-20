import { useRef, useState } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001' })

const recent = [
  ['Senior Full Stack Developer', 'Today, 2:30 PM', '92'],
  ['Backend Developer', 'Apr 24, 2025', '87'],
  ['Frontend Developer', 'Apr 20, 2025', '85'],
]

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>
}

export default function App() {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [jd, setJd] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const validateFile = (candidate) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(candidate?.type)) return 'Please upload a PDF or DOCX file.'
    if (candidate.size > 5 * 1024 * 1024) return 'File must be smaller than 5 MB.'
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
    } catch (requestError) {
      setStatus('failed')
      setError(requestError.response?.data?.message || 'The analysis could not be completed.')
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">✦</div><strong>AI Resume<br />Analyzer</strong></div>
        <nav>
          <button className="nav active"><Icon>▦</Icon>Dashboard</button>
          <button className="nav"><Icon>⇧</Icon>Analyze Resume</button>
          <button className="nav"><Icon>◷</Icon>My History</button>
          <button className="nav"><Icon>♙</Icon>Profile</button>
          <button className="nav"><Icon>⚙</Icon>Settings</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade"><b>★</b><strong>Upgrade to Pro</strong><p>Get deeper insights and personalized advice.</p><button>Upgrade</button></div>
          <button className="logout">↪ Logout</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div><button className="bell">♧</button><div className="avatar">BR</div><strong>Bhargav Reddy⌄</strong></div>
        </header>

        <div className="content">
          <section className="heading">
            <div>
              <h1><span>AI</span> Resume Analyzer</h1>
              <p>Upload your <b>resume</b> and get <b>instant</b> AI-powered insights<br />on your skills, strengths and areas for improvement.</p>
            </div>
            <div className="hero-art" aria-hidden="true"><div className="document">♙<i /><i /><i /></div><div className="ai">AI</div></div>
          </section>

          <section className="input-grid">
            <div className="upload-card" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
              event.preventDefault()
              const candidate = event.dataTransfer.files[0]
              const validation = validateFile(candidate)
              setError(validation)
              if (!validation) setFile(candidate)
            }}>
              <input ref={inputRef} hidden type="file" accept=".pdf,.docx" onChange={(event) => {
                const candidate = event.target.files[0]
                const validation = validateFile(candidate)
                setError(validation)
                if (!validation) setFile(candidate)
              }} />
              <div className="upload-mark">⇧</div>
              <h2>{file?.name || 'Upload Your Resume'}</h2>
              <p>{file ? 'Ready to analyze' : 'Drag & drop your file here or click to browse'}<br /><small>Supports PDF, DOCX (Max 5MB)</small></p>
              <button className="choose" onClick={() => inputRef.current?.click()}><Icon>▤</Icon>{file ? 'Change File' : 'Choose File'}</button>
            </div>

            <div className="jd-card">
              <h2>Or Analyze with Job Description</h2>
              <p>Paste the job description to get a tailored analysis</p>
              <textarea value={jd} onChange={(event) => setJd(event.target.value)} placeholder="Paste job description here..." />
              {error && <div className="error">{error}</div>}
              <button className="analyze" onClick={analyze} disabled={status === 'analyzing'}><Icon>✦</Icon>{status === 'analyzing' ? 'Analyzing...' : 'Analyze Resume'}</button>
            </div>
          </section>

          {result && (
            <section className="results-grid">
              <div className="panel">
                <div className="panel-heading"><h2>Coverage Analysis</h2></div>
                <div className="analysis-summary">
                  <div className="score"><strong>{result.coverage}%</strong><span>Coverage</span></div>
                  <ul>{result.requirements?.slice(0, 4).map((item) => <li key={item.requirement}><b>{item.status === 'matched' ? '✓' : '△'}</b><span>{item.requirement}</span></li>)}</ul>
                </div>
              </div>
              <div className="panel insights">
                <h2>✦ Key Insights</h2>
                <ul>{result.strengths?.slice(0, 3).map((item) => <li key={item}>✓ {item}</li>)}</ul>
              </div>
              <div className="panel history">
                <div className="panel-heading"><h2>◷ Analysis History</h2><button>View All →</button></div>
                {recent.map(([title, date, score]) => <div className="history-row" key={title}><div className="doc">▤</div><div><strong>{title}</strong><small>{date}</small></div><b>{score}% Match</b></div>)}
              </div>
            </section>
          )}

          {!result && <section className="benefits">
            <div className="benefit-main"><div>✦</div><span><strong>Powered by Advanced AI</strong><small>Evidence-backed insights powered by an isolated provider adapter</small></span></div>
            <div><b>ϟ</b><strong>Instant Results</strong></div><div><b>◆</b><strong>Secure & Private</strong></div><div><b>⌁</b><strong>Actionable Tips</strong></div>
          </section>}
        </div>
      </main>
    </div>
  )
}
