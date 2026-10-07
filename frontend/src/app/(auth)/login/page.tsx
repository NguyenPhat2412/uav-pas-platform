import { AuthSidebar } from '@/features/auth/components/AuthSidebar';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const metadata = {
  title: 'Đăng nhập | UAV PAS Platform',
  description: 'Đăng nhập vào hệ thống điều hành bay tự động UAV PAS',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      <AuthSidebar />
      <div className="flex items-center justify-center bg-surface-bright p-4 sm:p-6 lg:p-8 min-h-screen">
        <main className="w-full max-w-md mx-auto flex flex-col justify-center">
          <LoginForm />
        </main>
      </div>
    </div>
  );
}
