import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

const signInWithMagicLink = vi.fn();
const signInWithOAuthProvider = vi.fn();
const signInWithPassword = vi.fn();
const signUpWithPassword = vi.fn();

vi.mock("@/actions/auth", () => ({
  signInWithMagicLink: (...args: unknown[]) => signInWithMagicLink(...args),
  signInWithOAuthProvider: (...args: unknown[]) =>
    signInWithOAuthProvider(...args),
  signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
  signUpWithPassword: (...args: unknown[]) => signUpWithPassword(...args),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    signInWithMagicLink.mockReset();
    signInWithOAuthProvider.mockReset();
    signInWithPassword.mockReset();
    signUpWithPassword.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows SSO buttons for Google and Apple", () => {
    render(<LoginForm />);
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with apple/i })
    ).toBeInTheDocument();
  });

  it("defaults to email & password for signup without magic-link email", () => {
    render(<LoginForm />);
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^sign in$/i })
    ).toBeInTheDocument();
  });

  it("shows inline error for empty email and sets aria-invalid", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    const input = screen.getByLabelText(/email address/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(/enter your email/i);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("shows inline error for invalid email format", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "not-valid");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/valid email/i);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("requires a password before signing in", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "you@example.com"
    );
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/password/i);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("disables submit while pending and preserves email after failure", async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: { error: string }) => void = () => undefined;
    signInWithPassword.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    render(<LoginForm />);
    const input = screen.getByLabelText(/email address/i);
    await user.type(input, "you@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "long-enough");

    const submit = screen.getByRole("button", { name: /^sign in$/i });
    await user.click(submit);

    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("aria-busy", "true");
    expect(input).toHaveValue("you@example.com");

    resolvePromise({
      error: "Incorrect email or password. Create an account if you’re new.",
    });

    await waitFor(() => {
      expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
    });
    expect(input).toHaveValue("you@example.com");
  });

  it("announces magic-link server errors in an aria-live region", async () => {
    const user = userEvent.setup();
    signInWithMagicLink.mockResolvedValue({
      error:
        "Unable to reach the sign-in service. Check your connection and try again.",
    });

    render(<LoginForm />);
    await user.click(screen.getByRole("tab", { name: /magic link/i }));
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

  it("switches to password mode after magic-link rate limit", async () => {
    const user = userEvent.setup();
    signInWithMagicLink.mockResolvedValue({
      error: "Too many auth emails were sent recently.",
      rateLimited: true,
    });

    render(<LoginForm />);
    await user.click(screen.getByRole("tab", { name: /magic link/i }));
    await user.type(
      screen.getByLabelText(/email address/i),
      "you@example.com"
    );
    await user.click(screen.getByRole("button", { name: /send magic link/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create account/i })
      ).toBeInTheDocument();
    });
  });
});
