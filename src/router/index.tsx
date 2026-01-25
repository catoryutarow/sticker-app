import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '@/app/App';
import { AuthGuard } from '@/auth';
import { CreatorLayout, SignupPage, LoginPage, DashboardPage, KitsPage, NewKitPage, KitDetailPage } from '@/creator';

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
      {
        path: 'kits',
        element: <KitsPage />,
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
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
