'use client';
import { useEffect, useRef, useState } from 'react';
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button, StatusBadge } from '@/components/ui';
import { useI18n } from '@/contexts/I18nContext';

export function UavModelViewer({ serial = 'UAV', status = 'UNKNOWN', compact = false }: { serial?: string; status?: string; compact?: boolean }) {
  const initial = { x: -12, y: -24 };
  const [rotation, setRotation] = useState(initial);
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const { t } = useI18n();
  useEffect(() => {
    if (!expanded) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointer.current) return;
    setRotation(current => ({ x: Math.max(-28, Math.min(20, current.x + (event.clientY - pointer.current!.y) * -0.2)), y: current.y + (event.clientX - pointer.current!.x) * 0.35 }));
    pointer.current = { x: event.clientX, y: event.clientY };
  };
  const reset = () => { setRotation(initial); setZoom(1); };
  const rotateByKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 12 : 6;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    setRotation(current => ({
      x: Math.max(-28, Math.min(20, current.x + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0))),
      y: current.y + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
    }));
  };
  const stage = <div className="uav-viewer-stage" role="img" aria-label={`${t('console.viewer.reference')} 3D ${serial}`} tabIndex={0} onKeyDown={rotateByKeyboard} onPointerDown={event => { pointer.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={move} onPointerUp={() => { pointer.current = null; }} onPointerCancel={() => { pointer.current = null; }}>
    <div className="uav-model" style={{ transform: 'translate(-50%, -50%) scale(' + zoom + ') rotateX(' + rotation.x + 'deg) rotateY(' + rotation.y + 'deg)' }}>
      <div className="uav-body"><span className="uav-camera" /><span className="uav-light uav-light-left" /><span className="uav-light uav-light-right" /></div>
      <div className="uav-arm uav-arm-a"><span className="uav-motor"><i /><i /><i /><i /></span></div><div className="uav-arm uav-arm-b"><span className="uav-motor"><i /><i /><i /><i /></span></div><div className="uav-arm uav-arm-c"><span className="uav-motor"><i /><i /><i /><i /></span></div><div className="uav-arm uav-arm-d"><span className="uav-motor"><i /><i /><i /><i /></span></div>
    </div>
    <div className="uav-stage-grid" /><div className="uav-stage-hint">{t('console.viewer.rotateHint')}</div>
  </div>;
  const toolbar = <div className="uav-viewer-toolbar"><div><span className="eyebrow">{t('console.viewer.reference').toUpperCase()}</span><strong>{serial}</strong></div><StatusBadge status={status} /><div className="flex gap-1"><button type="button" className="icon-button" aria-label={t('console.viewer.zoomOut')} onClick={() => setZoom(value => Math.max(.75, value - .1))}><ZoomOut size={15} /></button><button type="button" className="icon-button" aria-label={t('console.viewer.zoomIn')} onClick={() => setZoom(value => Math.min(1.35, value + .1))}><ZoomIn size={15} /></button><button type="button" className="icon-button" aria-label={t('console.viewer.reset')} onClick={reset}><RotateCcw size={15} /></button></div></div>;
  return <>
    <section className={'uav-viewer ' + (compact ? 'uav-viewer-compact' : '')} aria-label={`${t('console.viewer.reference')} 3D ${serial}`}>
      {toolbar}{stage}
      {!compact && <div className="uav-viewer-footer"><span>{t('console.viewer.model')} <strong>CSS reference</strong></span><span>{t('console.viewer.license')} <strong>{t('console.viewer.internalOriginal')}</strong></span><Button variant="outline" size="sm" leftIcon={<Maximize2 size={14} />} onClick={() => setExpanded(true)}>{t('console.viewer.expand')}</Button></div>}
    </section>
    {expanded && <div className="uav-model-overlay" role="dialog" aria-modal="true" aria-label={`${t('console.viewer.reference')} 3D ${serial}`}><div className="uav-model-dialog"> <header><strong>{serial}</strong><button type="button" className="icon-button" aria-label={t('console.viewer.close')} onClick={() => setExpanded(false)}>×</button></header>{toolbar}{stage}</div></div>}
  </>;
}
