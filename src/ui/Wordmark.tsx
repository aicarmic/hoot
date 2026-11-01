/** "Hoot", where the "oo" is a pair of glasses with pupils. */
export function Wordmark() {
  return (
    <span className="wordmark" role="img" aria-label="Hoot">
      <span aria-hidden="true">H</span>
      <svg aria-hidden="true" width="31" height="16" viewBox="0 0 36 18">
        <circle cx="8.5" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="27.5" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M15.5 8.6 Q18 6.2 20.5 8.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="10" cy="10.5" r="2.2" fill="currentColor" />
        <circle cx="29" cy="10.5" r="2.2" fill="currentColor" />
      </svg>
      <span aria-hidden="true">t</span>
    </span>
  )
}
