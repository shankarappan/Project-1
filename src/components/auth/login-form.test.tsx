import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

const signInWithMagicLink = vi.fn();

vi.mock("@/actions/auth", () => ({
  signInWithMagicLink: (...args: unknown[]) => signInWithMagicLink(...args),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    signInWithMagicLink.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows inline error for empty email and sets aria-invalid", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    const input = screen.getByLabelText(/email address/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(/enter your email/i);
    expect(signInWithMagicLink).not.toHaveBeenCalled();
  });

  it("shows inline error for invalid email format", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "not-valid");
    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/valid email/i);
    expect(signInWithMagicLink).not.toHaveBeenCalled();
  });

  it("disables submit while pending and preserves email after failure", async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: { error: string }) => void = () => undefined;
    signInWithMagicLink.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    render(<LoginForm />);
    const input = screen.getByLabelText(/email address/i);
    await user.type(input, "you@example.com");

    const submit = screen.getByRole("button", { name: /send magic link/i });
    await user.click(submit);

    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("aria-busy", "true");
    expect(input).toHaveValue("you@example.com");

    resolvePromise({
      error:
        "Too many sign-in attempts. Please wait a minute and try again.",
    });

    await waitFor(() => {
      expect(
        screen.getByText(/too many sign-in attempts/i)
      ).toBeInTheDocument();
    });
    expect(input).toHaveValue("you@example.com");
  });

  it("announces server errors in an aria-live region", async () => {
    const user = userEvent.setup();
    signInWithMagicLink.mockResolvedValue({
      error:
        "Unable to reach the sign-in service. Check your connection and try again.",
    });

    render(<LoginForm />);
    await user.type(
      screen.getByLabelText(/email address/i),
      "you@example.com"
    );
    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    const live = document.querySelector("[aria-live='polite']");
    expect(live).toBeTruthy();
    await waitFor(() => {
      expect(live).toHaveTextContent(/unable to reach/i);
    });
  });
});
