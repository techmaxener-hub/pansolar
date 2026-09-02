'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { cn } from './cn';

export interface KanbanColumnDef {
  key: string;
  title: string;
}

export interface KanbanCardData {
  id: string;
  columnKey: string;
}

export interface KanbanBoardProps<T extends KanbanCardData> {
  columns: KanbanColumnDef[];
  cards: T[];
  renderCard: (card: T) => ReactNode;
  onCardMove: (cardId: string, toColumnKey: string) => void;
}

/** 7-stage EPC Kanban pipeline — drag a lead card across Lead → Shading Survey → … → Subsidy Disbursal. */
export function KanbanBoard<T extends KanbanCardData>({ columns, cards, renderCard, onCardMove }: KanbanBoardProps<T>) {
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnCards = cards.filter((c) => c.columnKey === column.key);
        return (
          <div
            key={column.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(column.key);
            }}
            onDragLeave={() => setDragOverColumn((prev) => (prev === column.key ? null : prev))}
            onDrop={() => {
              if (dragCardId) onCardMove(dragCardId, column.key);
              setDragCardId(null);
              setDragOverColumn(null);
            }}
            className={cn(
              'flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-3 backdrop-blur-xl',
              dragOverColumn === column.key && 'border-solar-emerald/50 bg-solar-emerald/5'
            )}
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-200">{column.title}</h3>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-400">{columnCards.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {columnCards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => setDragCardId(card.id)}
                  onDragEnd={() => setDragCardId(null)}
                  className={cn(
                    'cursor-grab rounded-xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-xl active:cursor-grabbing',
                    dragCardId === card.id && 'opacity-50'
                  )}
                >
                  {renderCard(card)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
