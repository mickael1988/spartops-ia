type Props = {
  progress: number
  label: string
  urgent: boolean
}

export function CountdownRing({ progress, label, urgent }: Props) {
  const SIZE = 200
  const STROKE = 12
  const R = (SIZE - STROKE) / 2
  const CIRCUMFERENCE = 2 * Math.PI * R
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <div className="relative flex items-center justify-center">
      <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-muted/40"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          stroke={urgent ? "#ef4444" : "#3F5EFB"}
        />
      </svg>
      <span
        role="timer"
        className={`absolute text-5xl font-mono font-bold tabular-nums ${
          urgent ? "text-red-500" : "text-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  )
}
