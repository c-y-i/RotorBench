import { vi } from "vitest";
import { act, render, screen } from '@testing-library/react';
import App, { RouteLoading } from './App';
import { getA11yViolations } from './test/a11y';

vi.mock("./components/HomePage", () => ({
  default: () => <div>Home</div>,
}));
vi.mock("./components/BuildPage", () => ({
  default: () => <div>Build</div>,
}));
vi.mock("./components/SetupPage", () => ({
  default: () => <div>Setup</div>,
}));
vi.mock("./components/ComparePage", () => ({
  default: () => <div>Compare</div>,
}));
vi.mock("./components/AnalysisPage", () => ({
  default: () => <div>Analysis</div>,
}));
vi.mock("./components/UserProfilePage", () => ({
  default: () => <div>Profile</div>,
}));
vi.mock("./components/SavedConfigsPage", () => ({
  default: () => <div>Saved</div>,
}));
vi.mock("./components/LegalPage", () => ({
  default: () => <div>Legal</div>,
}));

async function settleLazyRoute() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

test('renders legal and safety navigation link', async () => {
  render(<App />);
  const linkElement = screen.getByRole('link', { name: /legal & safety/i });
  expect(linkElement).toBeInTheDocument();
  await settleLazyRoute();
});

test('renders the hardware setup destination', async () => {
  render(<App />);
  expect(screen.getAllByRole('link', { name: 'Setup' })).toHaveLength(2);
  await settleLazyRoute();
});

test('keeps the compact mobile New Build action explicitly labelled', async () => {
  render(<App />);
  expect(screen.getByRole('link', { name: 'New build' }))
    .toHaveAttribute('href', '/build?new=1');
  await settleLazyRoute();
});

test('route loading exposes one status and hides decorative placeholders', async () => {
  const { container } = render(<RouteLoading />);

  expect(screen.getByRole('status')).toHaveTextContent('Loading workspace');
  expect(screen.getByTestId('route-loading-skeleton'))
    .toHaveAttribute('aria-hidden', 'true');
  expect(await getA11yViolations(container)).toEqual([]);
});
