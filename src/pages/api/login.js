// src/pages/api/login.js
import ActiveDirectory from 'activedirectory2';

export default async function handler(req, res) {
  // Chỉ cho phép phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Lấy username và password từ body của request
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu.' });
  }

  // Cấu hình kết nối
  const config = {
    url: 'ldap://ctu.edu.vn',
    baseDN: 'DC=ctu,DC=edu,DC=vn',
  };

  try {
    const ad = new ActiveDirectory(config);
    const userToAuth = `${username}@ctu.edu.vn`;

    ad.authenticate(userToAuth, password, (err, auth) => {
      if (err) {
        console.error('LDAP Authentication Error:', JSON.stringify(err));
        return res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu.' });
      }

      if (auth) {
        return res.status(200).json({ success: true, message: 'Đăng nhập thành công!' });
      } else {
        return res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu.' });
      }
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi từ máy chủ, không thể kết nối AD.' });
  }
}
