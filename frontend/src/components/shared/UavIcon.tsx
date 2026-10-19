import type { SVGProps } from 'react';

/** Quadcopter outline, matching the 24px / 2px stroke of the interface icons. */
export function UavIcon({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <circle cx="5" cy="5" r="3" /><circle cx="19" cy="5" r="3" />
    <circle cx="5" cy="19" r="3" /><circle cx="19" cy="19" r="3" />
    <path d="m7 7 3 3m4 0 3-3M7 17l3-3m4 0 3 3" />
    <rect x="9" y="9" width="6" height="6" rx="2" /><path d="M12 11v2" />
  </svg>;
}
