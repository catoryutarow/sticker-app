import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import App from '@/app/App';
import { AuthGuard } from '@/auth';
import { AdminGuard } from '@/admin';

const WorkPage = lazy(() => import('@/app/pages/WorkPage').then((module) => ({ default: module.WorkPage })));
const CreatorLayout = lazy(() => import('@/creator').then((module) => ({ default: module.CreatorLayout })));
const SignupPage = lazy(() => import('@/creator').then((module) => ({ default: module.SignupPage })));
const LoginPage = lazy(() => import('@/creator').then((module) => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('@/creator').then((module) => ({ default: module.DashboardPage })));
const NewKitPage = lazy(() => import('@/creator').then((module) => ({ default: module.NewKitPage })));
const KitDetailPage = lazy(() => import('@/creator').then((module) => ({ default: module.KitDetailPage })));
const QuickCreatePage = lazy(() => import('@/creator').then((module) => ({ default: module.QuickCreatePage })));
const ForgotPasswordPage = lazy(() => import('@/creator').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/creator').then((module) => ({ default: module.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('@/creator').then((module) => ({ default: module.VerifyEmailPage })));

const AdminLayout = lazy(() => import('@/admin').then((module) => ({ default: module.AdminLayout })));
const AdminLoginPage = lazy(() => import('@/admin').then((module) => ({ default: module.AdminLoginPage })));
const AdminDashboardPage = lazy(() => import('@/admin').then((module) => ({ default: module.AdminDashboardPage })));
const UsersPage = lazy(() => import('@/admin').then((module) => ({ default: module.UsersPage })));
const UserDetailPage = lazy(() => import('@/admin').then((module) => ({ default: module.UserDetailPage })));
const AdminKitsPage = lazy(() => import('@/admin').then((module) => ({ default: module.AdminKitsPage })));
const AdminNewKitPage = lazy(() => import('@/admin').then((module) => ({ default: module.AdminNewKitPage })));
const TagsPage = lazy(() => import('@/admin').then((module) => ({ default: module.TagsPage })));
const AdminArticlesPage = lazy(() => import('@/admin').then((module) => ({ default: module.AdminArticlesPage })));
const ArticleEditPage = lazy(() => import('@/admin').then((module) => ({ default: module.ArticleEditPage })));
const AdminBackgroundsPage = lazy(() => import('@/admin').then((module) => ({ default: module.AdminBackgroundsPage })));

const PrivacyPage = lazy(() => import('@/pages').then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import('@/pages').then((module) => ({ default: module.TermsPage })));
const ContactPage = lazy(() => import('@/pages').then((module) => ({ default: module.ContactPage })));
const AboutPage = lazy(() => import('@/pages').then((module) => ({ default: module.AboutPage })));
const ArticlesPage = lazy(() => import('@/pages').then((module) => ({ default: module.ArticlesPage })));
const ArticlePage = lazy(() => import('@/pages').then((module) => ({ default: module.ArticlePage })));
const NotFoundPage = lazy(() => import('@/pages').then((module) => ({ default: module.NotFoundPage })));

const withSuspense = (element: ReactNode) => (
  <Suspense fallback={null}>
    {element}
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/w/:shareId',
    element: withSuspense(<WorkPage />),
  },
  // Legal & Info pages
  {
    path: '/privacy',
    element: withSuspense(<PrivacyPage />),
  },
  {
    path: '/terms',
    element: withSuspense(<TermsPage />),
  },
  {
    path: '/contact',
    element: withSuspense(<ContactPage />),
  },
  {
    path: '/about',
    element: withSuspense(<AboutPage />),
  },
  // Blog pages
  {
    path: '/articles',
    element: withSuspense(<ArticlesPage />),
  },
  {
    path: '/articles/:slug',
    element: withSuspense(<ArticlePage />),
  },
  {
    path: '/creator/signup',
    element: withSuspense(<SignupPage />),
  },
  {
    path: '/creator/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/creator/forgot-password',
    element: withSuspense(<ForgotPasswordPage />),
  },
  {
    path: '/reset-password',
    element: withSuspense(<ResetPasswordPage />),
  },
  {
    path: '/verify-email',
    element: withSuspense(<VerifyEmailPage />),
  },
  {
    path: '/creator',
    element: (
      <AuthGuard>
        {withSuspense(<CreatorLayout />)}
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: withSuspense(<DashboardPage />),
      },
      {
        path: 'kits',
        element: <Navigate to="/creator" replace />,
      },
      {
        path: 'kits/quick',
        element: withSuspense(<QuickCreatePage />),
      },
      {
        path: 'kits/quick/:kitId',
        element: withSuspense(<QuickCreatePage />),
      },
      {
        path: 'kits/new',
        element: withSuspense(<NewKitPage />),
      },
      {
        path: 'kits/:kitId',
        element: withSuspense(<KitDetailPage />),
      },
    ],
  },
  // Admin routes
  {
    path: '/admin/login',
    element: withSuspense(<AdminLoginPage />),
  },
  {
    path: '/admin',
    element: (
      <AdminGuard>
        {withSuspense(<AdminLayout />)}
      </AdminGuard>
    ),
    children: [
      {
        index: true,
        element: withSuspense(<AdminDashboardPage />),
      },
      {
        path: 'users',
        element: withSuspense(<UsersPage />),
      },
      {
        path: 'users/:userId',
        element: withSuspense(<UserDetailPage />),
      },
      {
        path: 'kits',
        element: withSuspense(<AdminKitsPage />),
      },
      {
        path: 'kits/new',
        element: withSuspense(<AdminNewKitPage />),
      },
      {
        path: 'kits/:kitId',
        element: withSuspense(<KitDetailPage />),
      },
      {
        path: 'tags',
        element: withSuspense(<TagsPage />),
      },
      {
        path: 'backgrounds',
        element: withSuspense(<AdminBackgroundsPage />),
      },
      {
        path: 'articles',
        element: withSuspense(<AdminArticlesPage />),
      },
      {
        path: 'articles/new',
        element: withSuspense(<ArticleEditPage />),
      },
      {
        path: 'articles/:articleId',
        element: withSuspense(<ArticleEditPage />),
      },
    ],
  },
  // 404 fallback
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
