import { useState, useEffect } from 'react';
import { useAuth } from './AdminApp';
import { adminApi } from '@/lib/api';
import { Plus, Trash2, Key, X } from 'lucide-react';

interface User {
  username: string;
  role: string;
  display_name: string;
  created_at: string;
}

export default function UserManager() {
  const { token, role } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [resetUser, setResetUser] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  // Add form
  const [newUser, setNewUser] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [newDisplay, setNewDisplay] = useState('');

  // Reset form
  const [resetPw, setResetPw] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.getUsers(token).then((res) => {
      if (res.success && res.data) setUsers(res.data.users);
      setLoading(false);
    });
  };

  useEffect(load, [token]);

  if (role !== 'admin') {
    return <div className="text-center py-12 text-gray-400">僅管理員可管理使用者</div>;
  }

  const handleAdd = async () => {
    if (!newUser.trim() || !newPw.trim()) { setMsg('帳號和密碼必填'); return; }
    setMsg('');
    const res = await adminApi.createUser(token, {
      username: newUser.trim(),
      password: newPw,
      role: newRole,
      display_name: newDisplay.trim() || undefined,
    });
    if (res.success) {
      setShowAdd(false);
      setNewUser(''); setNewPw(''); setNewRole('viewer'); setNewDisplay('');
      load();
    } else {
      setMsg(res.error || '建立失敗');
    }
  };

  const handleDelete = async (username: string) => {
    if (!confirm(`確定刪除使用者 ${username}？`)) return;
    await adminApi.deleteUser(token, username);
    load();
  };

  const handleResetPw = async () => {
    if (!resetUser || resetPw.length < 8) { setMsg('密碼至少 8 字元'); return; }
    setMsg('');
    const res = await adminApi.resetPassword(token, resetUser, resetPw);
    if (res.success) {
      setResetUser(null);
      setResetPw('');
      setMsg('密碼已重設');
    } else {
      setMsg(res.error || '重設失敗');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-davis-navy">使用者管理</h1>
        <button onClick={() => setShowAdd(true)} className="btn-davis flex items-center gap-1 text-sm">
          <Plus size={16} /> 新增
        </button>
      </div>

      {msg && <div className="bg-blue-50 text-blue-600 text-sm rounded-xl p-3 mb-4">{msg}</div>}

      {loading ? (
        <p className="text-gray-400 text-center py-12">載入中...</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium">帳號</th>
                <th className="px-4 py-3 font-medium">顯示名稱</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">建立時間</th>
                <th className="px-4 py-3 font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.username} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3">{u.display_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-50 text-red-600' : u.role === 'editor' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('zh-TW')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setResetUser(u.username); setResetPw(''); }} className="p-1 text-gray-400 hover:text-davis-blue" title="重設密碼">
                        <Key size={14} />
                      </button>
                      <button onClick={() => handleDelete(u.username)} className="p-1 text-gray-400 hover:text-red-500" title="刪除">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add user modal */}
      {showAdd && (
        <Modal title="新增使用者" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <InputField label="帳號" value={newUser} onChange={setNewUser} />
            <InputField label="密碼" value={newPw} onChange={setNewPw} type="password" />
            <InputField label="顯示名稱" value={newDisplay} onChange={setNewDisplay} />
            <div>
              <label className="text-xs text-gray-500 block mb-1">角色</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowAdd(false)} className="btn-davis-outline flex-1">取消</button>
            <button onClick={handleAdd} className="btn-davis flex-1">建立</button>
          </div>
        </Modal>
      )}

      {/* Reset password modal */}
      {resetUser && (
        <Modal title={`重設密碼: ${resetUser}`} onClose={() => setResetUser(null)}>
          <InputField label="新密碼" value={resetPw} onChange={setResetPw} type="password" />
          <p className="text-xs text-gray-400 mt-1">至少 8 字元</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setResetUser(null)} className="btn-davis-outline flex-1">取消</button>
            <button onClick={handleResetPw} className="btn-davis flex-1">重設</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-davis-navy">{title}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-davis-blue/30" />
    </div>
  );
}
