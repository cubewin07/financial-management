import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AuthGuard from './components/auth/AuthGuard';
import { ConfirmationProvider } from './context/ConfirmationContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfirmationProvider>
        <AuthGuard>
          <App />
        </AuthGuard>
      </ConfirmationProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
