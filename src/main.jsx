import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AuthGuard from './components/auth/AuthGuard';
import { ConfirmationProvider } from './context/ConfirmationContext';
import { getRouterBasename } from './utils/routeUtils';
import './index.css';

const basename = getRouterBasename(import.meta.env.BASE_URL);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <ConfirmationProvider>
        <AuthGuard>
          <App />
        </AuthGuard>
      </ConfirmationProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
