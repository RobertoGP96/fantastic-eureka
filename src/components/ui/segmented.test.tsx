import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Segmented, SegmentedLinks } from "./segmented";

// El setup del repo no limpia el DOM entre tests: sin esto se acumulan renders.
afterEach(cleanup);

describe("Segmented", () => {
  const options = [
    { value: "week", label: "7 días" },
    { value: "month", label: "1 mes" },
    { value: "year", label: "1 año" },
  ] as const;

  it("marca la opción activa con aria-pressed y nombra el grupo", () => {
    render(
      <Segmented
        options={options}
        value="month"
        onValueChange={() => {}}
        ariaLabel="Período"
      />
    );
    expect(screen.getByRole("group", { name: "Período" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 mes" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "7 días" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("avisa del cambio con el valor elegido y no envía formularios", () => {
    const onValueChange = vi.fn();
    render(
      <Segmented
        options={options}
        value="month"
        onValueChange={onValueChange}
        ariaLabel="Período"
      />
    );
    const button = screen.getByRole("button", { name: "1 año" });
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onValueChange).toHaveBeenCalledWith("year");
  });
});

describe("SegmentedLinks", () => {
  it("renderiza enlaces y marca el actual", () => {
    render(
      <SegmentedLinks
        ariaLabel="Filtrar deudas"
        current="cobrar"
        options={[
          { value: "todas", label: "Todas", href: "/deudas" },
          { value: "cobrar", label: "Por cobrar", href: "/deudas?dir=cobrar" },
        ]}
      />
    );
    expect(
      screen.getByRole("navigation", { name: "Filtrar deudas" })
    ).toBeInTheDocument();
    const current = screen.getByRole("link", { name: "Por cobrar" });
    expect(current).toHaveAttribute("href", "/deudas?dir=cobrar");
    expect(current).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Todas" })).not.toHaveAttribute(
      "aria-current"
    );
  });
});
