"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, PasswordInput, Alert } from '@/components/ui';
export function LoginForm() {
 const { login } = useAuth(); const router = useRouter();
 const [identity,setIdentity]=useState(''); const [password,setPassword]=useState('');
 const [pending,setPending]=useState(false); const [error,setError]=useState('');
 return <form className="space-y-6" onSubmit={async event=>{event.preventDefault();setPending(true);setError('');try {await login(identity,password);router.replace('/dashboard');}catch(e){setError(e instanceof Error?e.message:'Đăng nhập thất bại.');}finally{setPending(false);}}}>
 <div><h1 className="text-2xl font-bold">Đăng nhập quản trị</h1><p className="mt-2 text-slate-500">UAV PAS · Quản trị</p></div>
 {error && <Alert variant="error">{error}</Alert>}
 <Input id="identity" label="Tên đăng nhập hoặc email" autoComplete="username" required value={identity} onChange={e=>setIdentity(e.target.value)} disabled={pending}/>
 <PasswordInput id="password" label="Mật khẩu" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} disabled={pending}/>
 <Button type="submit" isLoading={pending} className="w-full">Đăng nhập</Button>
 </form>;
}
