'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { KanbanBoard, GlassBadge, type KanbanColumnDef } from '@solaros/ui';
import { moveProjectStage } from './actions';

const COLUMNS: KanbanColumnDef[] = [
  { key: 'lead', title: 'Lead' },
  { key: 'shading_survey', title: 'Shading Survey' },
  { key: 'bom_approval', title: 'BOM Approval' },
  { key: 'net_meter_sanction', title: 'Net-Meter Sanction' },
  { key: 'material_dispatch', title: 'Material Dispatch' },
  { key: 'erection_wiring', title: 'Erection & Wiring' },
  { key: 'testing_commissioning', title: 'Testing/Commissioning' },
  { key: 'subsidy_disbursal', title: 'Subsidy Disbursal' },
];

export interface CrmProject {
  id: string;
  columnKey: string;
  customerName: string;
  systemSizeKw: number;
  netCostInr: number;
  siteState: string;
}

export function CrmBoard({ tenantSlug, initialProjects }: { tenantSlug: string; initialProjects: CrmProject[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [isPending, startTransition] = useTransition();

  const handleMove = (projectId: string, toColumnKey: string) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, columnKey: toColumnKey } : p)));
    startTransition(async () => {
      await moveProjectStage(tenantSlug, projectId, toColumnKey);
    });
  };

  return (
    <div className={isPending ? 'opacity-70 transition-opacity' : ''}>
      <KanbanBoard
        columns={COLUMNS}
        cards={projects}
        onCardMove={handleMove}
        renderCard={(card) => (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-slate-100">{card.customerName}</p>
            <div className="flex items-center gap-2">
              <GlassBadge tone="emerald">{card.systemSizeKw} kW</GlassBadge>
              <GlassBadge>{card.siteState}</GlassBadge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">₹{card.netCostInr.toLocaleString('en-IN')} net</p>
              {/* draggable={false} keeps the browser's native link-drag from
                  fighting the kanban card's own custom drag-and-drop, which
                  is bound to this card's outer wrapper in KanbanBoard. */}
              <Link
                href={`/${tenantSlug}/quote/${card.id}`}
                draggable={false}
                className="text-xs text-emerald-300 hover:text-emerald-200 hover:underline"
              >
                View quote →
              </Link>
            </div>
          </div>
        )}
      />
    </div>
  );
}
