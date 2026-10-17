import React, { type ReactNode } from 'react';

export function PortalAuthLayout({ portal, title, description, homeUrl, tools, children }: {
  portal: string;
  title: string;
  description: string;
  homeUrl: string;
  tools?: ReactNode;
  children: ReactNode;
}) {
  return <div className="portal-auth">
    <header className="portal-auth-header">
      <a href={homeUrl} className="portal-brand" aria-label="UAV PAS — Trang chủ">
        <img src="/vju-logo.svg" alt="Đại học Việt Nhật" width={34} height={34} />
        <strong>UAV PAS</strong>
      </a>
      <div className="portal-auth-links">{tools}<a href={homeUrl}>Về trang chủ <span aria-hidden="true">↗</span></a></div>
    </header>
    <main className="portal-auth-main">
      <section className="portal-auth-intro">
        <p className="portal-eyebrow">UAV MISSION OPERATIONS PLATFORM</p>
        <h1>{title}</h1>
        <p className="portal-auth-description">{description}</p>
        <figure className="portal-team-photo">
          <img src="/images/uav-people/uav-workshop-team-960.webp"
            srcSet="/images/uav-people/uav-workshop-team-640.webp 640w, /images/uav-people/uav-workshop-team-960.webp 960w"
            sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 900px) 45vw, 490px"
            alt="Ảnh minh họa kỹ thuật viên cùng chuẩn bị và kiểm tra UAV trước nhiệm vụ."
            width={960} height={640} decoding="async" />
          <figcaption><span>Con người phía sau mỗi nhiệm vụ</span><small>Ảnh minh họa</small></figcaption>
        </figure>
      </section>
      <section className="portal-auth-card" aria-label={portal}>
        <p className="portal-eyebrow">{portal}</p>
        {children}
      </section>
    </main>
    <footer className="portal-auth-footer"><span>UAV PAS · Đại học Việt Nhật</span><span>{portal}</span></footer>
  </div>;
}
