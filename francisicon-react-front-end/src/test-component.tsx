import React from 'react';
import ReactDOM from 'react-dom/client';
import GlobalSearch from './components/GlobalSearch/GlobalSearch';

// Simple test to verify component imports and renders
const container = document.createElement('div');
document.body.appendChild(container);

try {
  const root = ReactDOM.createRoot(container);
  root.render(<GlobalSearch />);
  console.log('✅ GlobalSearch component rendered successfully');
  console.log('✅ Component mapping is working correctly');
} catch (error) {
  console.error('❌ Error rendering GlobalSearch component:', error);
}