// src/pages/test-login.js
import { useState } from 'react';

export default function TestLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(`✅ THÀNH CÔNG: ${data.message}`);
      } else {
        setMessage(`❌ THẤT BẠI: ${data.message}`);
      }
    } catch (error) {
      setMessage('Lỗi kết nối đến server. Vui lòng kiểm tra lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '400px', margin: '5rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h1>Kiểm tra Đăng nhập AD</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="username" style={{ display: 'block', marginBottom: '5px' }}>Tài khoản:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Mật khẩu:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '10px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}>
          {isLoading ? 'Đang kiểm tra...' : 'Kiểm tra'}
        </button>
      </form>
      {message && (
        <p style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: message.includes('THÀNH CÔNG') ? '#d4edda' : '#f8d7da',
            color: message.includes('THÀNH CÔNG') ? '#155724' : '#721c24',
            border: '1px solid',
            borderColor: message.includes('THÀNH CÔNG') ? '#c3e6cb' : '#f5c6cb',
            borderRadius: '4px'
        }}>
          {message}
        </p>
      )}
    </div>
  );
}
