import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteGroupButton } from "./delete-group-button";

const deleteGroup = vi.fn();

vi.mock("@/actions/groups", () => ({
  deleteGroup: (...args: unknown[]) => deleteGroup(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("DeleteGroupButton", () => {
  beforeEach(() => {
    deleteGroup.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("asks for confirmation before deleting", async () => {
    const user = userEvent.setup();
    render(
      <DeleteGroupButton groupId="g1" groupName="Akl group 1" variant="icon" />
    );

    await user.click(
      screen.getByRole("button", { name: /delete group akl group 1/i })
    );
    expect(deleteGroup).not.toHaveBeenCalled();
    expect(screen.getByText(/confirm delete/i)).toBeInTheDocument();

    deleteGroup.mockResolvedValue({ error: "Nope" });
    await user.click(screen.getByRole("button", { name: /confirm delete/i }));

    await waitFor(() => {
      expect(deleteGroup).toHaveBeenCalledWith("g1");
    });
  });
});
