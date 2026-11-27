import localFont from "next/font/local";

// Fuente de la interfaz. Cambiarla es tocar SOLO este archivo: se expone como
// la variable CSS --font-app (en <html>) y globals.css la conecta a
// --font-sans, de modo que Tailwind y los portales de Radix la heredan.
//
// Outfit (SIL OFL) autoalojada: fuente variable con el subconjunto latin y
// cifras tabulares (`tnum`), que usa la clase .money. Antes venía de
// next/font/google, pero el build en Vercel fallaba cuando Google devolvía
// URLs de archivo sin extensión (TypeError en el loader).
export const appFont = localFont({
  src: "./outfit-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-app",
});
