import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Dev note: do not run in StrictMode when not in production
// because it makes useReducer call twice,
// and this breaks dev environments for some functionality such as addData.
// This is because the reducer is not a pure function (we edit directly
// the data instead of cloning it.)
createRoot(document.getElementById('root')!).render(<App />)
