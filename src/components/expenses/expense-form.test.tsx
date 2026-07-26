import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseForm } from "./expense-form";
import type { GroupMember } from "@/lib/types/database";

const createExpense = vi.fn();

vi.mock("@/actions/expenses", () => ({
  createExpense: (...args: unknown[]) => createExpense(...args),
}));

vi.mock("next/dist/client/components/redirect-error", () => ({
  isRedirectError: () => false,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const members: GroupMember[] = [
  {
    id: "m1",
    group_id: "g1",
    user_id: "user-a",
    role: "admin",
    joined_at: "",
    profiles: {
      id: "user-a",
      email: "a@test.com",
      full_name: "Ada",
      avatar_url: null,
      created_at: "",
    },
  },
  {
    id: "m2",
    group_id: "g1",
    user_id: "user-b",
    role: "member",
    joined_at: "",
    profiles: {
      id: "user-b",
      email: "b@test.com",
      full_name: "Ben",
      avatar_url: null,
      created_at: "",
    },
  },
  {
    id: "m3",
    group_id: "g1",
    user_id: "user-c",
    role: "member",
    joined_at: "",
    profiles: {
      id: "user-c",
      email: "c@test.com",
      full_name: "Cara",
      avatar_url: null,
      created_at: "",
    },
  },
];

describe("ExpenseForm percentage defaults", () => {
  beforeEach(() => {
    createExpense.mockReset();
    createExpense.mockResolvedValue({ error: "stop" });
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps controlled percentages totaling 100.00 when selection changes", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm groupId="g1" members={members} />);

    await user.click(screen.getByRole("button", { name: /^percentage$/i }));

    const pctA = screen.getByLabelText(/percentage for ada/i) as HTMLInputElement;
    const pctB = screen.getByLabelText(/percentage for ben/i) as HTMLInputElement;
    const pctC = screen.getByLabelText(/percentage for cara/i) as HTMLInputElement;

    const initialTotal =
      Math.round(Number(pctA.value) * 100) +
      Math.round(Number(pctB.value) * 100) +
      Math.round(Number(pctC.value) * 100);
    expect(initialTotal).toBe(10000);

    // Deselect Cara — remaining two must reallocate to exactly 100.00
    await user.click(screen.getByLabelText(/include cara/i));

    await waitFor(() => {
      expect(screen.queryByLabelText(/percentage for cara/i)).toBeNull();
    });

    const pctA2 = screen.getByLabelText(/percentage for ada/i) as HTMLInputElement;
    const pctB2 = screen.getByLabelText(/percentage for ben/i) as HTMLInputElement;
    const twoTotal =
      Math.round(Number(pctA2.value) * 100) +
      Math.round(Number(pctB2.value) * 100);
    expect(twoTotal).toBe(10000);

    await user.type(screen.getByLabelText(/^title$/i), "Lunch");
    await user.type(screen.getByLabelText(/amount/i), "90");
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => expect(createExpense).toHaveBeenCalled());
    const fd = createExpense.mock.calls[0]?.[1] as FormData;
    expect(fd.get("split_type")).toBe("percentage");
    const submitted =
      Math.round(Number(fd.get("pct_user-a")) * 100) +
      Math.round(Number(fd.get("pct_user-b")) * 100);
    expect(submitted).toBe(10000);
    expect(fd.getAll("participant_ids")).toEqual(["user-a", "user-b"]);
  });
});
