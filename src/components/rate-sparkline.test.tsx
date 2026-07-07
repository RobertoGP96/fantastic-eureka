// Tests del sparkline de tasas de las tarjetas del listado.
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { RateSparkline } from "./rate-sparkline";

afterEach(cleanup);

describe("RateSparkline", () => {
  it("dibuja polyline y punto final para 2+ valores", () => {
    const { container } = render(
      <RateSparkline values={[4_180_000, 4_360_000, 4_580_000]} />
    );
    const polyline = container.querySelector("polyline")!;
    expect(polyline).toBeTruthy();
    expect(polyline.getAttribute("points")!.split(" ")).toHaveLength(3);
    const dot = container.querySelector("circle")!;
    expect(dot.getAttribute("fill")).toBe("var(--color-brand)");
  });

  it("centra la línea cuando la serie es plana", () => {
    const { container } = render(<RateSparkline values={[100, 100, 100]} />);
    const ys = container
      .querySelector("polyline")!
      .getAttribute("points")!
      .split(" ")
      .map((pair) => Number(pair.split(",")[1]));
    // Altura por defecto 30 → todos los puntos a media altura.
    expect(ys.every((y) => y === 15)).toBe(true);
  });

  it("no renderiza nada con menos de dos valores", () => {
    const { container } = render(<RateSparkline values={[4_180_000]} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
