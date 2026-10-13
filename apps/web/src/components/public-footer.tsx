import Link from 'next/link';
import { customerUrl } from '../content/site-content';

export function PublicFooter() {
  return <footer className="site-footer"><div className="shell footer-grid">
    <div><Link className="brand" href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><img src="/vju-logo.svg" alt="VJU Logo" width={30} height={30} style={{ width: 30, height: 30, objectFit: 'contain' }} /><span>UAV PAS</span></Link><p className="footer-note">A public view of the platform connecting service requests with mission operations.</p></div>
    <div><h2>Explore</h2><Link href="/services">Services</Link><Link href="/solutions">Solutions</Link><Link href="/how-it-works">How it works</Link><Link href="/faq">FAQ</Link></div>
    <div><h2>Continue</h2><a href={`${customerUrl}/login`}>Customer Portal</a><a href={`${customerUrl}/register`}>Create account</a><Link href="/contact">Contact</Link></div>
    <div><h2>Legal</h2><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><p className="footer-note">Public pricing and contact details will be published after approval.</p></div>
  </div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} UAV PAS</span><span>Public capability information is labelled by readiness.</span></div></footer>;
}
