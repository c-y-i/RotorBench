import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UserProfilePage from "./UserProfilePage";

beforeEach(() => {
  localStorage.clear();
});

test("registration keeps primary actions in the profile form flow", async () => {
  render(
    <MemoryRouter>
      <UserProfilePage />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole("heading", { name: "Create your profile" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Email address")).toBeInTheDocument();

  expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
  const cancel = screen.getByRole("button", { name: "Cancel" });
  expect(cancel).toHaveClass("profile-action-secondary");
  expect(cancel).not.toHaveClass("order");
});
