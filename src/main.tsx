
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ConditionalClerkProvider } from './components/ConditionalClerkProvider';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ConditionalClerkProvider>
      <App />
    </ConditionalClerkProvider>
  </BrowserRouter>
);