/** The app icon with "Hoot" next to it, as in the top bar. */
export function Wordmark() {
  return (
    <span className="wordmark">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="32" height="32" />
      Hoot
    </span>
  )
}
