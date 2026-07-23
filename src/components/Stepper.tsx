interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  max?: number | null;
}

export function Stepper({ value, onChange, max }: StepperProps) {
  return (
    <div className="stepper">
      <button aria-label="Disminuir" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
        −
      </button>
      <span>{value}</span>
      <button
        aria-label="Aumentar"
        onClick={() => onChange(value + 1)}
        disabled={max != null && value >= max}
      >
        +
      </button>
    </div>
  );
}
