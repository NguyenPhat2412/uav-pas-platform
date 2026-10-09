'use client';

import { LoginForm } from '@/features/auth/components/LoginForm';
import { AuthSidebar } from '@/features/auth/components/AuthSidebar';

export default function LoginPage() {
  return <main className="auth-page"><AuthSidebar /><section className="auth-form-panel"><div className="auth-form-container"><LoginForm redirectTo="/overview" /></div></section></main>;
}
