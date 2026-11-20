import { useState } from 'react'

export default function HistoryPage({
  history,
  averageCoverage,
  highestCoverage,
  busyId,
  setPage,
  setResult,
  openAnalysis,
  exportAnalysis,
  deleteAnalysis,
  renameAnalysis,
}) {
  const [editingId, setEditingId] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const beginRename = (item) => {
    setEditingId(item.id)
    setTitle(item.title || item.resumeFilename || 'Resume analysis')
    setError('')
  }

  const saveRename = async (id) => {
    setError('')
    try {
      await renameAnalysis(id, title)
      setEditingId('')
    } catch (requestError) {
      setError(requestError.message || 'Could not rename this report.')
    }
  }

  return (
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
        {error && <p className="error" role="alert">{error}</p>}
        {history.length === 0 ? (
          <div className="history-empty"><div className="history-empty-icon" aria-hidden="true">▤</div><h3>No reports yet</h3><p>Your completed analyses will appear here. Start by uploading a resume and adding a job description.</p><button type="button" onClick={() => { setPage('dashboard'); setResult(null) }}>Create your first analysis <span aria-hidden="true">→</span></button></div>
        ) : (
          <>
            <div className="history-table-header" aria-hidden="true"><span>Resume & role</span><span>Analyzed</span><span>Coverage</span><span>Actions</span></div>
            <div className="history-list">
              {history.map((item) => {
                const coverage = Math.max(0, Math.min(100, Number(item.coverage) || 0))
                const itemTitle = item.title || item.resumeFilename || 'Resume analysis'
                const analyzedAt = new Date(item.createdAt)
                return (
                  <article className="history-row" key={item.id}>
                    <span className="history-file-icon" aria-hidden="true">▤</span>
                    <div className="history-title">
                      {editingId === item.id ? (
                        <form className="history-rename-form" onSubmit={(event) => { event.preventDefault(); saveRename(item.id) }}>
                          <input aria-label="Report title" maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} />
                          <button type="submit" disabled={busyId === item.id || !title.trim()}>Save</button>
                          <button type="button" onClick={() => setEditingId('')}>Cancel</button>
                        </form>
                      ) : (
                        <button className="history-title-button" type="button" onClick={() => openAnalysis(item.id)} disabled={busyId === item.id}>
                          <strong>{itemTitle}</strong><small>{item.resumeFilename || 'Resume analysis'} <span>·</span> Evidence-based report</small>
                        </button>
                      )}
                    </div>
                    <div className="history-date"><strong>{analyzedAt.toLocaleDateString()}</strong><small>{analyzedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>
                    <div className="history-coverage"><div><strong>{coverage}%</strong><small>coverage</small></div><span className="coverage-track"><i style={{ width: `${coverage}%` }} /></span></div>
                    <div className="history-actions">
                      <button type="button" className="history-view-action" onClick={() => openAnalysis(item.id)} disabled={busyId === item.id}>View</button>
                      <button type="button" onClick={() => beginRename(item)} disabled={busyId === item.id}>Rename</button>
                      <button type="button" onClick={() => exportAnalysis(item.id)} aria-label={`Export ${itemTitle}`}>Export</button>
                      <button type="button" className="history-delete-action" onClick={() => deleteAnalysis(item.id)} disabled={busyId === item.id} aria-label={`Delete ${itemTitle}`}>Delete</button>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>
    </section>
  )
}
