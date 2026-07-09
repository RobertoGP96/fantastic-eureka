import { useId } from "react";

/**
 * Logotipo de la app: F y E en un cuadro redondeado partido por una ola
 * senoidal (pecera) — letras azules sobre la superficie y blancas bajo el
 * agua. Mismo dibujo que src/app/icon.svg (favicon); useId evita colisiones
 * de ids de clipPath si se monta más de una vez en la página.
 */
export function BrandMark({ className }: { className?: string }) {
  const id = useId();
  const wave =
    "M0 262 C40 226 88 226 128 262 C168 298 216 298 256 262 " +
    "C296 226 344 226 384 262 C424 298 472 298 512 262";
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="Logotipo FE"
    >
      <defs>
        <clipPath id={`${id}-box`}>
          <rect width="512" height="512" rx="118" />
        </clipPath>
        <clipPath id={`${id}-above`}>
          <path d={`${wave} L512 0 L0 0 Z`} />
        </clipPath>
        <clipPath id={`${id}-below`}>
          <path d={`${wave} L512 512 L0 512 Z`} />
        </clipPath>
        <linearGradient
          id={`${id}-water`}
          x1="0"
          y1="262"
          x2="0"
          y2="512"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#2f8fe6" />
          <stop offset="1" stopColor="#1257b8" />
        </linearGradient>
        <g id={`${id}-letters`}>
          <path d="M136 150 h116 v46 h-70 v44 h62 v44 h-62 v86 h-46 Z" />
          <path d="M282 150 h118 v46 h-72 v42 h64 v44 h-64 v42 h72 v46 h-118 Z" />
        </g>
      </defs>
      <g clipPath={`url(#${id}-box)`}>
        <rect width="512" height="512" fill="#eaf5ff" />
        <path d={`${wave} L512 512 L0 512 Z`} fill={`url(#${id}-water)`} />
        <g clipPath={`url(#${id}-above)`}>
          <use href={`#${id}-letters`} fill="#1a67cc" />
        </g>
        <g clipPath={`url(#${id}-below)`}>
          <use href={`#${id}-letters`} fill="#ffffff" />
        </g>
        <path
          d={wave}
          fill="none"
          stroke="#ffffff"
          strokeWidth="14"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
