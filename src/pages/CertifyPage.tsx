import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitCertification } from '@/lib/api';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [agreed, setAgreed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.shop_name.trim()) {
      setError('姓名和店名必填');
      return;
    }
    if (!agreed) {
      setError('請先閱讀並同意認證規則');
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
      setCertId(res.data.cert_id || res.data.id);
    } else {
      setError(res.error || '提交失敗');
    }
  };

  if (certId) {
    return (
      <div className="max-w-lg mx-auto p-4 py-16 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
        <h1 className="text-2xl font-bold text-davis-navy mb-2">申請已送出</h1>
        <p className="text-gray-600 mb-2">Davis Taiwan 將安排實體考核，審核後會通知您</p>
        <p className="text-sm text-gray-400">認證編號: {certId}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 py-8">
      <h1 className="text-2xl font-bold text-davis-navy mb-2">{t('certify.title')}</h1>
      <p className="text-gray-500 text-sm mb-6">填寫以下資料，我們將盡快審核您的認證申請</p>

      {/* Rules section */}
      <div className="bg-davis-light border border-davis-blue/10 rounded-xl mb-6">
        <button
          onClick={() => setRulesOpen(!rulesOpen)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <span className="font-bold text-davis-navy text-sm">Davis 認證美容師申請須知</span>
          {rulesOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {rulesOpen && (
          <div className="px-4 pb-4 text-sm text-gray-700 space-y-4">
            <div>
              <h4 className="font-bold text-davis-navy mb-1">申請資格</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>須為台灣地區寵物美容從業人員</li>
                <li>須經 Davis Taiwan 台灣總代理實體考核通過</li>
                <li>須具備基本寵物美容技術能力</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-davis-navy mb-1">認證規則</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>認證有效期為<strong>一年</strong>，到期需重新續約</li>
                <li>認證期間須持續使用 Davis 產品進行洗護服務</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-red-600 mb-1">禁止事項（違反將停權或撤銷）</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>透過非 Davis Taiwan 台灣總代理之管道購入 Davis 產品（水貨、海外代購、非授權經銷商）</li>
                <li>以 Davis 認證美容師身分代言、推廣或使用其他品牌洗護產品進行服務</li>
                <li>在社群媒體散布不實 Davis 產品資訊或惡意詆毀品牌</li>
                <li>冒用其他認證美容師之編號或資格</li>
                <li>申請資料造假（學經歷、店名、照片不實）</li>
                <li>因不當使用 Davis 產品導致寵物受到傷害（未遵守官方稀釋比例與使用方式）</li>
                <li>經查證屬實之重大客訴且拒絕改善</li>
                <li>認證期間未持續向 Davis Taiwan 採購產品（連續 6 個月無任何採購紀錄）</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-davis-navy mb-1">認證美容師權益</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>列名於 Davis Taiwan 官網認證美容師列表</li>
                <li>獲得 Davis 認證美容師專屬徽章與驗證頁面</li>
                <li>優先獲得 Davis 新品試用與教育訓練資訊</li>
                <li>可合法使用 Davis 品牌素材進行門店宣傳</li>
                <li>可分裝 Davis 產品於自有門店販售（須標示原廠資訊）</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-davis-navy mb-1">處分等級</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>輕微違規（首次）：</strong>書面警告</li>
                <li><strong>一般違規：</strong>停權 1-6 個月，改善後可申請恢復</li>
                <li><strong>嚴重違規（水貨、代言競品、造假）：</strong>永久撤銷，不得重新申請</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-davis-navy mb-1">申請流程</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>填寫下方申請表單</li>
                <li>Davis Taiwan 台灣總代理安排實體考核</li>
                <li>考核通過後頒發認證編號</li>
                <li>認證資訊將顯示在 Davis Taiwan 官網認證美容師列表</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-davis-navy mb-1">考核內容</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>基本洗護操作流程</li>
                <li>Davis 產品知識（稀釋比例、適用場景）</li>
                <li>品種毛質判斷能力</li>
                <li>客戶溝通與服務態度</li>
              </ul>
            </div>

            <div className="text-xs text-gray-500 border-t pt-3">
              如有疑問請聯繫 Davis Taiwan：
              <br />🌐 davistaiwan.com ・ 💬 LINE @davistaiwan
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('certify.name')} required value={form.name} onChange={set('name')} maxLength={20} />
        <Field label={t('certify.shop')} required value={form.shop_name} onChange={set('shop_name')} maxLength={50} />
        <Field label={t('certify.city')} value={form.city} onChange={set('city')} maxLength={20} />
        <Field label={t('certify.phone')} value={form.phone} onChange={set('phone')} type="tel" maxLength={20} />
        <Field label={t('certify.email')} value={form.email} onChange={set('email')} type="email" maxLength={100} />
        <Field label={t('certify.ig')} value={form.instagram} onChange={set('instagram')} placeholder="https://instagram.com/..." maxLength={200} />
        <Field label={t('certify.fb')} value={form.facebook} onChange={set('facebook')} placeholder="https://facebook.com/..." maxLength={200} />

        {/* Agreement checkbox */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">
            我已閱讀並同意上述認證規則，理解違規將導致認證停權或撤銷
          </span>
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={submitting || !agreed} className="btn-davis w-full text-lg disabled:opacity-50">
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
