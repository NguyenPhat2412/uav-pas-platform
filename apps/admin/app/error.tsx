'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="p-8 space-y-4"><h1>Không thể hiển thị trang</h1><p>Vui lòng thử lại. Dữ liệu chưa lưu có thể cần nhập lại.</p><button onClick={reset}>Thử lại</button></main>;}
