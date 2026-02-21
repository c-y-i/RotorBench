import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/HomePage', () => () => <div>Home</div>);
jest.mock('./components/BuildPage', () => () => <div>Build</div>);
jest.mock('./components/AnalysisPage', () => () => <div>Analysis</div>);
jest.mock('./components/UserProfilePage', () => () => <div>Profile</div>);
jest.mock('./components/SavedConfigsPage', () => () => <div>Saved</div>);
jest.mock('./components/LegalPage', () => () => <div>Legal</div>);

test('renders legal footer link', () => {
  render(<App />);
  const linkElement = screen.getByRole('link', { name: /legal & disclaimer/i });
  expect(linkElement).toBeInTheDocument();
});
