import React from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './AppRouter';
import { Provider } from 'react-redux';
import { store } from './store';
import { ToastProvider } from './contexts/ToastContext';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <Provider store={store}>
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  </Provider>
);