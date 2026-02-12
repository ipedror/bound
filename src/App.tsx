// ============================================================
// App - Main application entry point with Router
// ============================================================

import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

export default function App() {
  return <RouterProvider router={router} />;
}
