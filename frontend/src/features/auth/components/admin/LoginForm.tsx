"use client";
import { useState } from 'react';
import { AuthCredentials } from "@/components/shared";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Alert } from "@/components/admin/ui";
export function LoginForm() {
 const { login } = useAuth(); const router = useRouter();
 const [identity,setIdentity]=useState(''); const [password,setPassword]=useState('');
 const [pending,setPending]=useState(false); const [error,setError]=useState('');
 return <form className="space-y-6" onSubmit={async event=>{event.preventDefault();setPending(true);setError('');try {await login(identity,password);router.replace("/admin/dashboard");}catch(e){setError(e instanceof Error?e.message:'Đăng nhập thất bại.');}finally{setPending(false);}}}>
 <div><h2 className="text-2xl font-bold">Đăng nhập quản trị</h2><p className="mt-2 text-slate-500">UAV PAS · Quản trị</p></div>
 {error && <Alert variant="error">{error}</Alert>}
 <AuthCredentials identity={identity} password={password} onIdentityChange={setIdentity} onPasswordChange={setPassword} disabled={pending}/>
 <Button type="submit" isLoading={pending} className="w-full">Đăng nhập</Button>
 </form>;
}
