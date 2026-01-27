import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import App from '@/app/App';
import { WorkPage } from '@/app/pages/WorkPage';
import { AuthGuard } from '@/auth';
import { CreatorLayout, SignupPage, LoginPage, DashboardPage, NewKitPage, KitDetailPage } from '@/creator';
import {
  AdminLayout,
  AdminGuard,
  AdminLoginPage,
  AdminDashboardPage,
  UsersPage,
  UserDetailPage,
  AdminKitsPage,
  AdminNewKitPage,
  TagsPage,
} from '@/admin';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/w/:shareId',
    element: <WorkPage />,
  },
  {
    path: '/creator/signup',
    element: <SignupPage />,
  },
  {
    path: '/creator/login',
    element: <LoginPage />,
  },
  {
    path: '/creator',
    element: (
      <AuthGuard>
        <CreatorLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'kits',
        element: <Navigate to="/creator" replace />,
      },
      {
        path: 'kits/new',
        element: <NewKitPage />,
      },
      {
        path: 'kits/:kitId',
        element: <KitDetailPage />,
      },
    ],
  },
  // Admin routes
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: (
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboardPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'users/:userId',
        element: <UserDetailPage />,
      },
      {
        path: 'kits',
        element: <AdminKitsPage />,
      },
      {
        path: 'kits/new',
        element: <AdminNewKitPage />,
      },
      {
        path: 'kits/:kitId',
        element: <KitDetailPage />,
      },
      {
        path: 'tags',
        element: <TagsPage />,
      },
    ],
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
