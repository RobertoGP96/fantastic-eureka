/**
 * Logotipo de la app: F y E en un cuadro redondeado partido por una ola
 * senoidal (pecera) — letras verde petróleo sobre la superficie y blancas
 * bajo el agua (paleta del design system: brand/brand-light/chip). Mismo
 * dibujo que src/app/icon.svg (favicon). Los ids de
 * clipPath/gradiente son deterministas (`idPrefix`) porque useId() producía
 * ids distintos entre SSR y cliente dentro del tooltip Radix del sidebar
 * (error de hidratación); cada punto de montaje pasa su propio prefijo para
 * no colisionar si conviven en la misma página.
 */
export function BrandMark({
  className,
  idPrefix = "fe-mark",
}: {
  className?: string;
  idPrefix?: string;
}) {
  const id = idPrefix;
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
          <stop offset="0" stopColor="#27b3a4" />
          <stop offset="1" stopColor="#0c6b70" />
        </linearGradient>
        {/* Contornos de la fuente American Captain (cap 240, baseline 378),
            extraídos a path con opentype.js — no depende de la fuente. */}
        <g id={`${id}-letters`}>
          <path d="M141.4 378L141.4 138L234.7 138L243 182.7L190.7 182.7L190.7 239.6L230.4 239.6L230.4 281L190.7 281L190.7 378Z" />
          <path d="M269 378L269 138L362.4 138L370.6 182.7L318.3 182.7L318.3 239.6L358 239.6L358 281L318.3 281L318.3 333.3L368.6 333.3L360.4 378Z" />
        </g>
      </defs>
      <g clipPath={`url(#${id}-box)`}>
        <rect width="512" height="512" fill="#dcf0ec" />
        <path d={`${wave} L512 512 L0 512 Z`} fill={`url(#${id}-water)`} />
        <g clipPath={`url(#${id}-above)`}>
          <use href={`#${id}-letters`} fill="#0c6b70" />
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
