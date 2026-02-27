import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App';

// Mock theme for MUI components
const mockTheme = createTheme();

// Mock useMediaQuery to always return false (desktop mode)
jest.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(false),
}));

test('renders app without crashing', () => {
  // App already includes BrowserRouter and ThemeProvider internally
  render(<App />);
  // Just verify the app renders without errors
  expect(document.body).toBeTruthy();
});
