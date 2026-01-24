import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '@/app/App';
import { AuthGuard } from '@/auth';
import { CreatorLayout, SignupPage, LoginPage, DashboardPage } from '@/creator';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
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
      // 将来のルート
      // { path: 'kits', element: <KitsPage /> },
      // { path: 'kits/new', element: <NewKitPage /> },
    ],
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
