import { displayLabel } from '@uav/ui/presentation';
import { cn } from '@/lib/utils';

const tones: Record<string, string> = {
  AVAILABLE: 'status-badge-online', ACTIVE: 'status-badge-online', ONLINE: 'status-badge-online', IN_PROGRESS: 'status-badge-info', READY: 'status-badge-info',
  RESERVED: 'status-badge-warning', MAINTENANCE: 'status-badge-warning', PENDING_CONFIRMATION: 'status-badge-warning', WARNING: 'status-badge-warning',
  OFFLINE: 'status-badge-danger', FAILED: 'status-badge-danger', ERROR: 'status-badge-danger', CANCELLED: 'status-badge-muted', DRAFT: 'status-badge-muted',
};

export function StatusBadge({ status, label }: { status?: string; label?: string }) {
  const normalized = (status || 'UNKNOWN').toUpperCase();
  return <span className={cn('status-badge', tones[normalized] || 'status-badge-muted')}><span className="status-dot" />{label || displayLabel(normalized)}</span>;
}
