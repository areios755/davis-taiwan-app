import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitCertification } from '@/lib/api';
import { CheckCircle } from 'lucide-react';

interface FormData {
  name: string;
  shop_name: string;
  city: string;
  phone: string;
  email: string;
  instagram: string;
  facebook: string;
}

const INITIAL: FormData = {
  name: '',
  shop_name: '',
  city: '',
  phone: '',
  email: '',
  instagram: '',
  facebook: '',
};

export default function CertifyPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [certId, setCertId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.shop_name.trim()) {
      setError('姓名和店名必填');
      return;
    }
    setSubmitting(true);
    setError('');

    const res = await submitCertification({
      name: form.name.trim(),
      shop_name: form.shop_name.trim(),
      city: form.city.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      ig_url: form.instagram.trim(),
      fb_url: form.facebook.trim(),
    });

    setSubmitting(false);
    if (res.success && res.data) {
      setCertId(res.data.id);
    } else {
      setError(res.error || '提交失敗');
    }
  };

  if (certId) {
    return (
      <div className="max-w-lg mx-auto p-4 py-16 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
        <h1 className="text-2xl font-bold text-davis-navy mb-2">申請已送出</h1>
        <p className="text-gray-600 mb-2">審核後會通知您</p>
        <p className="text-sm text-gray-400">認證編號: {certId}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 py-8">
      <h1 className="text-2xl font-bold text-davis-navy mb-2">{t('certify.title')}</h1>
      <p className="text-gray-500 text-sm mb-6">填寫以下資料，我們將盡快審核您的認證申請</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('certify.name')} required value={form.name} onChange={set('name')} maxLength={20} />
        <Field label={t('certify.shop')} required value={form.shop_name} onChange={set('shop_name')} maxLength={50} />
        <Field label={t('certify.city')} value={form.city} onChange={set('city')} maxLength={20} />
        <Field label={t('certify.phone')} value={form.phone} onChange={set('phone')} type="tel" maxLength={20} />
        <Field label={t('certify.email')} value={form.email} onChange={set('email')} type="email" maxLength={100} />
        <Field label={t('certify.ig')} value={form.instagram} onChange={set('instagram')} placeholder="https://instagram.com/..." maxLength={200} />
        <Field label={t('certify.fb')} value={form.facebook} onChange={set('facebook')} placeholder="https://facebook.com/..." maxLength={200} />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-davis w-full text-lg disabled:opacity-50">
          {submitting ? t('common.loading') : t('certify.submit')}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  ...inputProps
}: {
  label: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-davis-navy mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        {...inputProps}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-davis-blue/30 text-sm"
      />
    </div>
  );
}
