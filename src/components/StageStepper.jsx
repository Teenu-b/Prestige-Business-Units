import { STAGES } from '../data/constants'

export default function StageStepper({ stage }) {
  return (
    <div className="stepper" aria-label="Opportunity stages">
      {STAGES.map((s) => {
        const state = s.id < stage ? 'done' : s.id === stage ? 'current' : ''
        return (
          <div key={s.id} className={`step ${state}`}>
            <div className="step-dot">{s.id < stage ? '✓' : s.id}</div>
            <div className="step-label">{s.short}</div>
          </div>
        )
      })}
    </div>
  )
}
