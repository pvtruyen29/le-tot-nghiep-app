// src/pages/admin.js
import { useState } from 'react';
import AdminDashboard from '../components/AdminDashboard';

// Đặt mật khẩu tạm thời ở đây. Sau này có thể nâng cấp lên hệ thống đăng nhập chuyên nghiệp.
const ADMIN_PASSWORD = "truyen123"; // <-- THAY MẬT KHẨU CỦA BẠN VÀO ĐÂY

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Mật khẩu không chính xác!');
    }
  };

  if (isLoggedIn) {
    return <AdminDashboard />;
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
      <h1>Trang Quản Trị</h1>
      <form onSubmit={handleLogin}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu"
          style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
        />
        <button type="submit" style={{ padding: '10px 20px' }}>Đăng nhập</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}
