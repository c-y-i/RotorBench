import { act, render, screen } from '@testing-library/react';
import App, { RouteLoading } from './App';
import { getA11yViolations } from './test/a11y';

jest.mock('./components/HomePage', () => () => <div>Home</div>);
jest.mock('./components/BuildPage', () => () => <div>Build</div>);
jest.mock('./components/SetupPage', () => () => <div>Setup</div>);
jest.mock('./components/ComparePage', () => () => <div>Compare</div>);
jest.mock('./components/AnalysisPage', () => () => <div>Analysis</div>);
jest.mock('./components/UserProfilePage', () => () => <div>Profile</div>);
jest.mock('./components/SavedConfigsPage', () => () => <div>Saved</div>);
jest.mock('./components/LegalPage', () => () => <div>Legal</div>);

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

test('route loading exposes one status and hides decorative placeholders', async () => {
  const { container } = render(<RouteLoading />);

  expect(screen.getByRole('status')).toHaveTextContent('Loading workspace');
  expect(screen.getByTestId('route-loading-skeleton'))
    .toHaveAttribute('aria-hidden', 'true');
  expect(await getA11yViolations(container)).toEqual([]);
});
