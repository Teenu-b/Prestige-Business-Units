import { STAGES } from '../data/constants'

export default function StageStepper({ stage, viewStage, onSelect }) {
  return (
    <div className="stepper" aria-label="Opportunity stages">
      {STAGES.map((s) => {
        const reached = s.id <= stage
        const state = [
          s.id < stage ? 'done' : '',
          s.id === stage ? 'current' : '',
          viewStage === s.id && s.id !== stage ? 'viewing' : '',
          reached ? 'clickable' : '',
        ].filter(Boolean).join(' ')
        return (
          <button
            key={s.id}
            type="button"
            className={`step ${state}`}
            disabled={!reached}
            onClick={() => reached && onSelect?.(s.id)}
            aria-current={viewStage === s.id ? 'step' : undefined}
          >
            <div className="step-dot">{s.id < stage ? '✓' : s.id}</div>
            <div className="step-label">{s.short}</div>
          </button>
        )
      })}
    </div>
  )
}
