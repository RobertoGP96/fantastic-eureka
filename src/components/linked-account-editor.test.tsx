// Tests del selector de cuenta vinculada de deudas y planes.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LinkedAccountEditor } from "./linked-account-editor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/ui-store", () => ({
  useUI: () => ({ showToast: vi.fn() }),
}));
// Las server actions importan Prisma (server-only): siempre mockeadas aquí.
vi.mock("@/app/actions/debt-actions", () => ({
  setDebtAccount: vi.fn(),
}));
vi.mock("@/app/actions/plan-actions", () => ({
  setPlanAccount: vi.fn(),
}));

afterEach(cleanup);

const accounts = [
  { id: "a1", name: "Efectivo CUP" },
  { id: "a2", name: "Banco CUP" },
];

describe("LinkedAccountEditor", () => {
  it("muestra la cuenta vinculada actual", () => {
    render(
      <LinkedAccountEditor
        kind="debt"
        targetId="d1"
        accounts={accounts}
        currentAccountId="a2"
        currencyCode="CUP"
      />
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Banco CUP");
  });

  it("muestra 'Sin cuenta' cuando no hay vínculo", () => {
    render(
      <LinkedAccountEditor
        kind="plan"
        targetId="p1"
        accounts={accounts}
        currentAccountId={null}
        currencyCode="CUP"
      />
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Sin cuenta");
  });

  it("invita a crear cuenta cuando no hay ninguna en la moneda", () => {
    render(
      <LinkedAccountEditor
        kind="debt"
        targetId="d1"
        accounts={[]}
        currentAccountId={null}
        currencyCode="MLC"
      />
    );
    expect(screen.getByText(/crea una cuenta en mlc/i)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
