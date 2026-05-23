import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { OrgProvider } from './context/OrgContext';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <OrgProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </OrgProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}
