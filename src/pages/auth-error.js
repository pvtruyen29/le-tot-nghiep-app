// src/pages/auth-error.js
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

export default function AuthErrorPage() {
  const router = useRouter();
  const { error } = router.query;

  let errorMessage = 'Đã có lỗi xảy ra trong quá trình đăng nhập.';
  let errorReason = 'Vui lòng thử lại hoặc liên hệ với quản trị viên.';

  if (error === 'InvalidDomain') {
    errorMessage = 'Email không hợp lệ';
    errorReason = 'Bạn phải sử dụng email do Trường Đại học Cần Thơ cấp (tên miền *.ctu.edu.vn).';
  }
  
  // Bạn có thể thêm các trường hợp lỗi khác ở đây
  // if (error === 'SomeOtherError') { ... }

  return (
    <>
      <Head>
        <title>Lỗi Đăng nhập</title>
      </Head>
      <div className="auth-error-container">
        <div className="auth-error-box">
          <h1>{errorMessage}</h1>
          <p>{errorReason}</p>
          <Link href="/" legacyBehavior>
            <a className="auth-error-button">Quay về Trang chủ</a>
          </Link>
        </div>
      </div>
    </>
  );
}
