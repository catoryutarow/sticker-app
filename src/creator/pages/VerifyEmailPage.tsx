import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/authApi';
import { useAuth } from '@/auth';

export const VerifyEmailPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendResult, setResendResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError(t('verifyEmail.noToken'));
      return;
    }

    const verifyEmail = async () => {
      try {
        await authApi.verifyEmail(token);
        setStatus('success');
        // ユーザー情報を更新
        await refreshUser?.();
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : t('verifyEmail.failed'));
      }
    };

    verifyEmail();
  }, [token, refreshUser]);

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendResult(null);
    try {
      await authApi.resendVerification();
      setResendResult({ type: 'success', text: t('forgotPassword.successMessage') });
    } catch (err) {
      setResendResult({ type: 'error', text: err instanceof Error ? err.message : t('dashboard.resendFailed') });
    } finally {
      setIsResending(false);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="mx-auto w-16 h-16 relative">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-xl font-medium text-gray-900">{t('verifyEmail.verifying')}</h2>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('verifyEmail.errorTitle')}</h2>
            <p className="mt-2 text-gray-600">{error}</p>
          </div>

          {/* ログイン済みの場合: 再送信ボタンを表示 */}
          {user ? (
            <div className="bg-gray-50 rounded-lg p-6 text-left">
              <p className="text-sm text-gray-600 mb-4">
                {t('verifyEmail.expiredHint')}
              </p>
              {resendResult && (
                <p className={`mb-4 text-sm ${resendResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {resendResult.text}
                </p>
              )}
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isResending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('forgotPassword.sending')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {t('dashboard.resendEmail')}
                  </>
                )}
              </button>
              <div className="mt-4 text-center">
                <Link
                  to="/creator"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {t('nav.backToDashboard')}
                </Link>
              </div>
            </div>
          ) : (
            /* 未ログインの場合: ログインを促す */
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                {t('verifyEmail.loginToResend')}
              </p>
              <Link
                to="/creator/login"
                className="inline-flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {t('nav.toLoginPage')}
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t('verifyEmail.successTitle')}</h2>
        <p className="mt-2 text-gray-600">
          {t('verifyEmail.successMessage')}
        </p>
        <div className="mt-8">
          <button
            onClick={() => navigate('/creator')}
            className="inline-flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {t('nav.toDashboard')}
          </button>
        </div>
      </div>
    </div>
  );
};
