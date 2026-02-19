import React from 'react';
import { render } from '@testing-library/react';
import GlobalSearch from './components/GlobalSearch/GlobalSearch';

test('renders GlobalSearch component', () => {
  render(<GlobalSearch />);
  // This test will pass if the component renders without errors
});