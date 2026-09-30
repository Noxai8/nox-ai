import "./NoxCompanion.css";
import React from "react";

export type NoxStage = 1 | 2 | 3 | 4 | 5;

type Props = {
  observedDays: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function getNoxStage(observedDays: number): NoxStage {
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
      className={`nox-companion nox-companion--${size} nox-companion--stage-${stage} ${className}`}
      role="img"
      aria-label={`Ton NOX, stade ${stage} sur 5, ${observedDays} jours observés`}
    >
      <div className="nox-companion__aura" />

      <div className="nox-companion__leaf nox-companion__leaf--back-1" />
      <div className="nox-companion__leaf nox-companion__leaf--back-2" />
      <div className="nox-companion__leaf nox-companion__leaf--back-3" />

      <div className="nox-companion__body">
        <div className="nox-companion__ear nox-companion__ear--left" />
        <div className="nox-companion__ear nox-companion__ear--right" />
        <div className="nox-companion__eye nox-companion__eye--left" />
        <div className="nox-companion__eye nox-companion__eye--right" />
        <div className="nox-companion__nose" />
      </div>

      <div className="nox-companion__foot nox-companion__foot--left" />
      <div className="nox-companion__foot nox-companion__foot--right" />

      <i className="nox-companion__spark nox-companion__spark--1" />
      <i className="nox-companion__spark nox-companion__spark--2" />
      <i className="nox-companion__spark nox-companion__spark--3" />
      <i className="nox-companion__spark nox-companion__spark--4" />
    </div>
  );
}
