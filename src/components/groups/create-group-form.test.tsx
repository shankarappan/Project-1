import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateGroupForm } from "./create-group-form";

const createGroup = vi.fn();

vi.mock("@/actions/groups", () => ({
  createGroup: (...args: unknown[]) => createGroup(...args),
}));

vi.mock("next/dist/client/components/redirect-error", () => ({
  isRedirectError: (err: unknown) =>
    err instanceof Error && err.message.startsWith("NEXT_REDIRECT"),
}));

describe("CreateGroupForm", () => {
  beforeEach(() => {
    createGroup.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("disables submit while pending and shows accessible pending text", async () => {
    const user = userEvent.setup();
    let resolveCreate: (() => void) | undefined;
    createGroup.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        })
    );

    const { container } = render(<CreateGroupForm />);
    const nameInput = container.querySelector("#name") as HTMLInputElement;
    await user.type(nameInput, "Trip");
    await user.click(container.querySelector('button[type="submit"]')!);

    await waitFor(() => {
      expect(container.querySelector('button[type="submit"]')).toBeDisabled();
    });
    expect(
      screen.getByText(/creating group, please wait/i)
    ).toBeInTheDocument();
    expect(createGroup).toHaveBeenCalledTimes(1);

    resolveCreate?.();
    await waitFor(() => expect(createGroup).toHaveBeenCalledTimes(1));
  });

  it("preserves errors and includes an idempotency key", async () => {
    const user = userEvent.setup();
    createGroup.mockRejectedValue(new Error("Boom"));

    const { container } = render(<CreateGroupForm />);
    const nameInput = container.querySelector("#name") as HTMLInputElement;
    await user.type(nameInput, "Trip");
    await user.click(container.querySelector('button[type="submit"]')!);

    expect(await screen.findByText("Boom")).toBeInTheDocument();
    const formData = createGroup.mock.calls[0]?.[0] as FormData;
    expect(formData.get("client_request_id")).toBeTruthy();
    expect(formData.get("name")).toBe("Trip");
  });

});

