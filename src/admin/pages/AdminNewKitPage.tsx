import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { kitsApi, type CreateKitRequest } from '@/api/kitsApi';
import { KitForm } from '@/creator/components/KitForm';

export const AdminNewKitPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateKitRequest) => {
    setIsSubmitting(true);
    try {
      const response = await kitsApi.createKit(data);
      navigate(`/admin/kits/${response.kit.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/kits');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* パンくず */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/admin" className="hover:text-gray-700">ダッシュボード</Link>
        <span>/</span>
        <Link to="/admin/kits" className="hover:text-gray-700">キット管理</Link>
        <span>/</span>
        <span className="text-gray-900">新規作成</span>
      </nav>

      {/* メインカード */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">新しいキットを作成</h1>
          <p className="mt-1 text-sm text-gray-500">
            キットの基本情報を入力してください
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
