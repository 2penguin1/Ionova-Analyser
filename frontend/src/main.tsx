import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import './index.css';
import { AppLayout } from '~/App';
import ImportsPage from '~/pages/ImportsPage';
import RunListPage from '~/pages/RunListPage';
import RunDetailPage from '~/pages/RunDetailPage';
import SearchPage from '~/pages/SearchPage';
import AnalyticsPage from '~/pages/AnalyticsPage';
import SavedFiltersPage from '~/pages/SavedFiltersPage';
import NlPage from '~/pages/NlPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/runs" replace /> },
      { path: 'runs', element: <RunListPage /> },
      { path: 'runs/:runId', element: <RunDetailPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'imports', element: <ImportsPage /> },
      { path: 'saved-filters', element: <SavedFiltersPage /> },
      { path: 'nl', element: <NlPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
