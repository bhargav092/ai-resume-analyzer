export default function ReportPage({ result, analysis, setPage, exportAnalysis, retryAnalysis }) {
  return (
    <section className="report-page">
      <div className="report-toolbar"><button type="button" onClick={() => setPage('history')}>← Back to history</button><div><button type="button" onClick={() => exportAnalysis(result.id || result._id)}>Export report</button><button type="button" onClick={retryAnalysis}>Analyze again</button></div></div>
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
  )
}
