import "./NoxCompanion.css";

type Props = {
  observedDays: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function getNoxStage(observedDays: number) {
  if (observedDays >= 365) return 5;
  if (observedDays >= 90) return 4;
  if (observedDays >= 30) return 3;
  if (observedDays >= 7) return 2;
  return 1;
}

export default function NoxCompanion({
  observedDays,
  size = "md",
  className = "",
}: Props) {
  const stage = getNoxStage(Math.max(0, observedDays));

  return (
    <div
      className={`nox-companion-v2 nox-companion-v2--${size} nox-companion-v2--stage-${stage} ${className}`}
      role="img"
      aria-label={`Ton NOX, stade ${stage} sur 5, ${observedDays} journées observées`}
    >
      <div className="nox-companion-v2__scene">
        <img
          className="nox-companion-v2__art"
          src={`/nox/nox-stage-${stage}.jpg`}
          alt=""
          draggable={false}
        />

        <div className="nox-companion-v2__halo" aria-hidden="true" />
        <div className="nox-companion-v2__blink" aria-hidden="true" />

        <div className="nox-companion-v2__particles" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, index) => (
            <i key={index} style={{ ["--i" as any]: index }} />
          ))}
        </div>

        <div className="nox-companion-v2__status" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
