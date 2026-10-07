import { AuthSidebar } from '@/features/auth/components/AuthSidebar';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export const metadata = {
  title: 'Đăng ký | UAV PAS Platform',
  description: 'Tạo tài khoản UAV PAS Platform',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      <AuthSidebar />
      <div className="flex items-center justify-center bg-surface-bright p-4 sm:p-6 lg:p-8 min-h-screen">
        <main className="w-full max-w-md mx-auto flex flex-col justify-center">
          <RegisterForm />
        </main>
      </div>
    </div>
  );
}
