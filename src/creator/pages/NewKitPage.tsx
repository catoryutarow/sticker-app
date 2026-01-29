import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { kitsApi, type CreateKitRequest } from '@/api/kitsApi';
import { KitForm } from '../components/KitForm';

export const NewKitPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateKitRequest) => {
    setIsSubmitting(true);
    try {
      const response = await kitsApi.createKit(data);
      navigate(`/creator/kits/${response.kit.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/creator/kits');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* パンくず */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/creator" className="hover:text-gray-700">{t('nav.dashboard')}</Link>
        <span>/</span>
        <span className="text-gray-900">{t('newKit.breadcrumb')}</span>
      </nav>

      {/* メインカード */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">{t('newKit.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('newKit.subtitle')}
          </p>
        </div>
        <div className="px-6 py-6">
          <KitForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};
