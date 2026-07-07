// Tests del gráfico lineal de tasas: geometría SVG, ticks, etiqueta directa
// del último punto y capa hover (jsdom no mide layout, así que se simula el
// ancho vía un ResizeObserver mock).
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RateLineChart, type RatePoint } from "./rate-line-chart";

const WIDTH = 600;

class MockResizeObserver {
  private readonly cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe() {
    this.cb(
      [{ contentRect: { width: WIDTH } } as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  globalThis.ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 3, 28); // 28 abr 2026

// EUR→CUP: 7 registros, de 418 a 458 (escalados ×10 000).
const POINTS: RatePoint[] = [
  4_180_000, 4_250_000, 4_210_000, 4_360_000, 4_480_000, 4_450_000, 4_580_000,
].map((rateScaled, i) => ({ t: T0 + i * 10 * DAY, rateScaled }));

const renderChart = (points: RatePoint[] = POINTS) =>
  render(<RateLineChart points={points} fromCode="EUR" toCode="CUP" />);

describe("RateLineChart", () => {
  it("dibuja la línea con un punto por registro y área de lavado", () => {
    const { container } = renderChart();
    const line = container.querySelector(
      'path[stroke="var(--color-brand)"]'
    ) as SVGPathElement;
    expect(line).toBeTruthy();
    // Un comando M inicial + 6 L = 7 puntos.
    expect(line.getAttribute("d")!.split("L")).toHaveLength(POINTS.length);
    expect(
      container.querySelector('path[fill="var(--color-brand)"]')
    ).toBeTruthy();
  });

  it("expone un aria-label descriptivo con la última tasa", () => {
    renderChart();
    expect(
      screen.getByRole("img", {
        name: "Evolución de la tasa EUR a CUP: 7 registros, última 458",
      })
    ).toBeTruthy();
  });

  it("pone ticks Y en números redondos y etiqueta directa solo al final", () => {
    renderChart();
    // Dominio 418–458 acolchado → ticks 420 / 440 / 460.
    for (const tick of ["420", "440", "460"]) {
      expect(screen.getByText(tick)).toBeTruthy();
    }
    // Etiqueta directa del último valor (458), sin etiquetar cada punto.
    expect(screen.getByText("458")).toBeTruthy();
    expect(screen.queryByText("425")).toBeNull();
  });

  it("muestra tooltip con fecha y tasa al pasar el puntero", () => {
    const { container } = renderChart();
    const svg = container.querySelector("svg")!;
    // jsdom da rect 0×0 → clientX es relativo al borde izquierdo (0).
    fireEvent(
      svg,
      new MouseEvent("pointermove", { clientX: WIDTH, bubbles: true })
    );
    expect(screen.getByText("1 EUR = 458 CUP")).toBeTruthy();
    expect(screen.getByText(/2026/)).toBeTruthy();
    // React deriva onPointerLeave de pointerout con relatedTarget externo.
    fireEvent(
      svg,
      new MouseEvent("pointerout", {
        bubbles: true,
        relatedTarget: document.body,
      })
    );
    expect(screen.queryByText("1 EUR = 458 CUP")).toBeNull();
  });

  it("con un solo punto no dibuja línea pero sí el punto etiquetado", () => {
    const { container } = renderChart([POINTS[0]]);
    expect(
      container.querySelector('path[stroke="var(--color-brand)"]')
    ).toBeNull();
    expect(container.querySelector("circle")).toBeTruthy();
    // "418" aparece como tick Y y como etiqueta directa del punto.
    expect(screen.getAllByText("418").length).toBeGreaterThan(0);
  });

  it("no renderiza nada sin puntos", () => {
    const { container } = renderChart([]);
    expect(container.querySelector("svg")).toBeNull();
  });
});
