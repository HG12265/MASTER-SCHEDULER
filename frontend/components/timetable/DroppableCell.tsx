"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { TimetableEntry } from "@/types";
import { DraggableTimetableEntry } from "./DraggableTimetableEntry";

interface DroppableCellProps {
  dayId: string;
  dayName: string;
  slotId: string;
  slotName: string;
  isTeachingSlot: boolean;
  isBreak?: boolean;
  isLunch?: boolean;
  entry: TimetableEntry | null;
  isEditMode: boolean;
  onOpenDetails: (entry: TimetableEntry) => void;
  onOpenMoveDialog: (entry: TimetableEntry) => void;
  onToggleLock: (entry: TimetableEntry) => void;
  onRemove: (entry: TimetableEntry) => void;
  onAddEntryClick: (dayId: string, dayName: string, slotId: string, slotName: string) => void;
}

export function DroppableCell({
  dayId,
  dayName,
  slotId,
  slotName,
  isTeachingSlot,
  isBreak,
  isLunch,
  entry,
  isEditMode,
  onOpenDetails,
  onOpenMoveDialog,
  onToggleLock,
  onRemove,
  onAddEntryClick,
}: DroppableCellProps) {
  const cellId = `${dayId}_${slotId}`;

  const { isOver, setNodeRef } = useDroppable({
    id: cellId,
    disabled: !isEditMode || !isTeachingSlot,
    data: {
      dayId,
      slotId,
      entry,
    },
  });

  // Non-teaching slots (Lunch or Break)
  if (!isTeachingSlot || isBreak || isLunch) {
    return (
      <div className="h-full min-h-[96px] bg-slate-950/40 border border-slate-900 rounded-xl p-2 flex items-center justify-center select-none">
        <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-600">
          {isLunch ? "Lunch" : "Break"}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`h-full min-h-[96px] rounded-xl transition-all p-1 flex flex-col justify-center ${
        isOver
          ? "bg-indigo-950/50 ring-2 ring-indigo-500 shadow-lg shadow-indigo-950/40 scale-[1.02]"
          : "bg-transparent"
      }`}
    >
      {entry ? (
        <DraggableTimetableEntry
          entry={entry}
          isEditMode={isEditMode}
          onOpenDetails={onOpenDetails}
          onOpenMoveDialog={onOpenMoveDialog}
          onToggleLock={onToggleLock}
          onRemove={onRemove}
        />
      ) : isEditMode ? (
        /* Empty Slot in Edit Mode */
        <button
          type="button"
          onClick={() => onAddEntryClick(dayId, dayName, slotId, slotName)}
          className="w-full h-full min-h-[88px] border border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-indigo-400 transition group"
        >
          <div className="p-1.5 rounded-lg bg-slate-900 group-hover:bg-indigo-600/10 border border-slate-800 group-hover:border-indigo-500/30 transition">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-medium pt-1 opacity-70 group-hover:opacity-100">
            Assign
          </span>
        </button>
      ) : (
        /* Empty Slot in View Mode */
        <div className="w-full h-full min-h-[88px] rounded-xl border border-slate-900/60 bg-slate-950/20 flex items-center justify-center">
          <span className="text-[10px] text-slate-700">—</span>
        </div>
      )}
    </div>
  );
}
