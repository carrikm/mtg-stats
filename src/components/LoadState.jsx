// Shown in place of a page while matches load or if loading failed.
export default function LoadState({ loadError, retry }) {
  if (loadError) {
    return (
      <div className="card notice">
        <p className="error">Couldn&apos;t load matches: {loadError}</p>
        <button type="button" className="btn" onClick={retry}>
          Try again
        </button>
      </div>
    )
  }
  return <p className="muted">Loading…</p>
}
