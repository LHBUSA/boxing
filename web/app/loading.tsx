// Navigation placeholder while a server-rendered route streams. Shape only: no numbers, names or guessed data.
export default function Loading() {
  return (
    <div className="wrap page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the record…</span>
      <div className="skel skel--eyebrow" />
      <div className="skel skel--title" />
      <div className="skel skel--line" />
      <div className="skel-grid">
        {Array.from({ length: 4 }, (_, i) => <div className="skel skel--card" key={i} />)}
      </div>
    </div>
  );
}
