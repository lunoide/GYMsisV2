import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Importar diagnósticos para desarrollo
if (import.meta.env.DEV) {
  import('./utils/memberRegistrationDiagnostic');
  import('./utils/simpleMemberCheck');
  import('./utils/authenticatedMemberCheck');
  import('./utils/setupAdminAndTest');
  import('./utils/trainerDiagnostic');
  import('./utils/profileCreationDiagnostic');
  import('./diagnostics/firebaseUsageDiagnostic');
  import('./diagnostics/registrationDiagnostic');
  import('./diagnostics/registrationDebugger');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
