import { enroll, startPreview } from '../lib/enrollment'
import { Icon } from '../ui/Icon'

/** Asked each time someone opens a class they are not enrolled in. */
export function EnrollSheet({ classId, title }: { classId: string; title: string }) {
  return (
    <>
      <div className="scrim" aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="enroll-title">
        <span className="handle" aria-hidden="true" />
        <div className="stack">
          <h2 className="h-sheet" id="enroll-title">
            Enroll in {title}?
          </h2>
          <p className="meta">
            Enrolling saves your progress, shows it to the family, and adds a daily reminder for this class (you can turn it off in
            Settings). Preview first to look around: nothing is saved and you stay unenrolled.
          </p>
        </div>
        <div className="stack">
          <button type="button" className="uy-btn uy-state uy-btn--filled uy-btn--with-icon block" autoFocus onClick={() => enroll(classId)}>
            <Icon name="check" />
            Enroll
          </button>
          <button type="button" className="uy-btn uy-state uy-btn--outlined block" onClick={() => startPreview(classId)}>
            Preview
          </button>
        </div>
      </div>
    </>
  )
}
