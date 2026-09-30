import './NoxCompanion.css';

export type NoxStage = 1 | 2 | 3 | 4 | 5;

type Props = {
  observedDays: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function getNoxStage(observedDays: number): NoxStage {
  if (observedDays >= 365) return 5;
  if (observedDays >= 90)  return 4;
  if (observedDays >= 30)  return 3;
  if (observedDays >= 7)   return 2;
  return 1;
}

export default function NoxCompanion({ observedDays, size = 'md', className = '' }: Props) {
  const stage = getNoxStage(Math.max(0, observedDays));

  return (
    <div
      className={`nox-companion nox-companion--${size} nox-companion--stage-${stage} ${className}`}
      role="img"
      aria-label={`Ton NOX, stade ${stage} sur 5`}
    >
      {/* Aura au sol */}
      <div className="nox-companion__aura" />

      {/* Extensions végétales — derrière le corps */}
      <div className="nox-companion__leaf nox-companion__leaf--l1" />
      <div className="nox-companion__leaf nox-companion__leaf--r1" />
      <div className="nox-companion__leaf nox-companion__leaf--l2" />
      <div className="nox-companion__leaf nox-companion__leaf--r2" />

      {/* Corps organique — contient les yeux */}
      <div className="nox-companion__body">
        <div className="nox-companion__eye nox-companion__eye--left" />
        <div className="nox-companion__eye nox-companion__eye--right" />
      </div>

      {/* Particules (stage 5 uniquement) */}
      <i className="nox-companion__spark nox-companion__spark--1" />
      <i className="nox-companion__spark nox-companion__spark--2" />
      <i className="nox-companion__spark nox-companion__spark--3" />
      <i className="nox-companion__spark nox-companion__spark--4" />
    </div>
  );
}
