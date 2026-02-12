// ============================================================
// Routes - Application route configuration
// ============================================================

import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import {
  HomePage,
  AreaPage,
  ContentPage,
  GraphPage,
  NotFoundPage,
} from '../pages';
import LoginPage from '../pages/LoginPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'area/:areaId',
        element: <AreaPage />,
      },
      {
        path: 'content/:contentId',
        element: <ContentPage />,
      },
      {
        path: 'graph',
        element: <GraphPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
