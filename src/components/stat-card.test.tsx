import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DeltaChip, StatCard } from "./stat-card";

// El setup del repo no limpia el DOM entre tests: sin esto se acumulan renders.
afterEach(cleanup);

// El contrato de DOM de StatCard lo usan los tests E2E (helper saldoActual:
// `getByText("Saldo actual").locator("xpath=..")` debe contener el monto).
describe("StatCard", () => {
  it("la etiqueta y el valor son hijos directos de la misma raíz", () => {
    render(<StatCard label="Saldo actual" value="4 750" unit="CUP" />);
    const label = screen.getByText("Saldo actual");
    const root = label.parentElement!;
    expect(root).toHaveTextContent("4 750 CUP");
    expect(root.getAttribute("class")).toContain("border");
  });

  it("separa la cifra de la unidad con un espacio real", () => {
    const { container } = render(
      <StatCard label="Ingresos" value="1 250" unit="CUP" />
    );
    // textContent sin normalizar: «1 250 CUP», nunca «1 250CUP».
    expect(container.textContent).toContain("1 250 CUP");
  });

  it("la etiqueta no es un encabezado", () => {
    render(<StatCard label="Cuentas activas" value="3" />);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("pinta la variación solo si hay dato, con su signo", () => {
    const { rerender } = render(
      <StatCard label="Ingresos" value="10" delta={12} />
    );
    expect(screen.getByText("+12%")).toBeInTheDocument();

    rerender(<StatCard label="Ingresos" value="10" delta={-5} deltaGood />);
    expect(screen.getByText("-5%")).toBeInTheDocument();

    rerender(<StatCard label="Ingresos" value="10" delta={null} />);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("con href la tarjeta entera es un único enlace", () => {
    render(
      <StatCard label="Por cobrar" value="45 000" unit="CUP" href="/deudas" />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/deudas");
    expect(link).toHaveTextContent("Por cobrar");
    expect(link).toHaveTextContent("45 000 CUP");
  });

  it("omite el mini-gráfico con menos de dos puntos", () => {
    const { container, rerender } = render(
      <StatCard label="Neto" value="1" sparkline={[5]} />
    );
    expect(container.querySelector("svg")).toBeNull();
    rerender(<StatCard label="Neto" value="1" sparkline={[1, 3, 2]} />);
    expect(container.querySelector("svg polyline")).not.toBeNull();
  });
});

describe("DeltaChip", () => {
  it("distingue favorable de desfavorable por clase de color", () => {
    const { container, rerender } = render(<DeltaChip value={8} good />);
    expect(container.firstElementChild).toHaveTextContent("+8%");
    const goodClass = container.firstElementChild!.getAttribute("class");

    rerender(<DeltaChip value={8} good={false} />);
    expect(container.firstElementChild!.getAttribute("class")).not.toBe(
      goodClass
    );
  });
});
