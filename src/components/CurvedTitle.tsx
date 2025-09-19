"use client";

import { useId } from "react";

type CurvedTitleProps = {
  text: string;
  className?: string;
  radius?: number;
};

const DEFAULT_RADIUS = 260;

export function CurvedTitle({
  text,
  className,
  radius = DEFAULT_RADIUS,
}: CurvedTitleProps) {
  const pathId = useId();
  const diameter = radius * 2;
  const verticalPadding = Math.max(60, radius * 0.35);
  const baseline = radius + verticalPadding;
  const viewBoxHeight = baseline + verticalPadding * 0.25;
  const baseClass = "font-balloon relative block";
  const combinedClass = className ? `${baseClass} ${className}` : baseClass;

  return (
    <h1 className={combinedClass}>
      <svg
        aria-hidden="true"
        className="mx-auto block w-full max-w-[min(90vw,620px)]"
        role="presentation"
        viewBox={`0 0 ${diameter} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          <path
            id={pathId}
            d={`M0 ${baseline} A ${radius} ${radius} 0 0 1 ${diameter} ${baseline}`}
          />
        </defs>
        <text
          fill="currentColor"
          fontWeight={700}
          style={{ fontSize: "1em", letterSpacing: "0.18em" }}
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {text}
          </textPath>
        </text>
      </svg>
      <span className="sr-only">{text}</span>
    </h1>
  );
}
