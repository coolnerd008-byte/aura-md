import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import './index.css';

if (window.location.pathname === '/auth/callback') {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');
  
  if (code && window.opener) {
    window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', code }, '*');
    window.close();
  } else if (error && window.opener) {
    window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error }, '*');
    window.close();
  } else if (!window.opener) {
    window.location.href = '/';
  }
  
  document.body.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, sans-serif; background-color: #1E1F22; color: white;">
      <h2 style="margin-bottom: 1rem;">Authentication Complete</h2>
      <p style="color: #949BA4;">This window should close automatically.</p>
    </div>
  `;
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
