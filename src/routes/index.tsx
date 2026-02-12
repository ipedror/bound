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

export const router = createBrowserRouter([
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
