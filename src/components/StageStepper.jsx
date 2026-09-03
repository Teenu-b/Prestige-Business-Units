import { Check } from 'lucide-react'
import { STAGES } from '../data/constants'
import { workStage } from '../lib/workflow'

export default function StageStepper({ stage, viewStage, onSelect }) {
  const current = workStage(stage)
  const viewing = workStage(viewStage || stage)
  return (
    <div className="stepper" aria-label="Opportunity stages">
      {STAGES.map((s, i) => {
        const reached = s.id <= current
        const state = [
          s.id < current ? 'done' : '',
          s.id === current ? 'current' : '',
          viewing === s.id && s.id !== current ? 'viewing' : '',
          reached ? 'clickable' : '',
        ].filter(Boolean).join(' ')
        return (
          <button
            key={s.id}
            type="button"
            className={`step ${state}`}
            disabled={!reached}
            onClick={() => reached && onSelect?.(s.id)}
            aria-current={viewing === s.id ? 'step' : undefined}
          >
            <div className="step-dot">{s.id < current ? <Check size={13} strokeWidth={3} /> : i + 1}</div>
            <div className="step-label">{s.short}</div>
          </button>
        )
      })}
    </div>
  )
}
