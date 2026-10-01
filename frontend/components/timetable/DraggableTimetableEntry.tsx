"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Lock, Shield, Layers, GripVertical, Trash2, ArrowRight } from "lucide-react";
import { TimetableEntry } from "@/types";

interface DraggableTimetableEntryProps {
  entry: TimetableEntry;
  isEditMode: boolean;
  onOpenDetails: (entry: TimetableEntry) => void;
  onOpenMoveDialog: (entry: TimetableEntry) => void;
  onToggleLock: (entry: TimetableEntry) => void;
  onRemove: (entry: TimetableEntry) => void;
}

export function DraggableTimetableEntry({
  entry,
  isEditMode,
  onOpenDetails,
  onOpenMoveDialog,
  onToggleLock,
  onRemove,
}: DraggableTimetableEntryProps) {
  const isLocked = entry.isFixed || entry.isLocked;
  const blockSize = entry.blockSize || 1;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    disabled: !isEditMode || isLocked,
    data: {
      entry,
      blockSize,
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 50,
      }
    : undefined;

  const isLab = entry.entryType === "SUBJECT" && blockSize > 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl p-2.5 text-xs transition-all shadow-sm border ${
        isDragging
          ? "opacity-50 ring-2 ring-indigo-500 shadow-xl"
          : isLab
          ? "bg-violet-950/40 border-violet-800/50 hover:border-violet-600 hover:shadow-violet-950/30"
          : entry.isFixed
          ? "bg-amber-950/30 border-amber-800/40 hover:border-amber-700"
          : entry.isLocked
          ? "bg-indigo-950/30 border-indigo-800/40 hover:border-indigo-700"
          : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-md"
      }`}
    >
      {/* Drag handle & top bar in Edit Mode */}
      {isEditMode && !isLocked && (
        <div
          {...listeners}
          {...attributes}
          className="absolute -top-1 -right-1 p-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-400 hover:text-white cursor-grab active:cursor-grabbing shadow transition opacity-0 group-hover:opacity-100"
          title="Drag period to move"
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}

      {/* Badges Bar */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        {entry.isFixed && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Shield className="w-2.5 h-2.5" />
            FIXED
          </span>
        )}

        {entry.isLocked && !entry.isFixed && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Lock className="w-2.5 h-2.5" />
            LOCKED
          </span>
        )}

        {blockSize > 1 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
            <Layers className="w-2.5 h-2.5" />
            {blockSize}-Period Block
          </span>
        )}
      </div>

      {/* Main Content */}
      <div onClick={() => onOpenDetails(entry)} className="cursor-pointer space-y-1">
        <h4 className="font-semibold text-slate-100 text-xs leading-snug line-clamp-1">
          {entry.subjectName || entry.title}
        </h4>

        {entry.facultyNames && entry.facultyNames.length > 0 && (
          <p className="text-[11px] text-slate-400 truncate">
            {entry.facultyNames.join(", ")}
          </p>
        )}

        {entry.resourceName && (
          <p className="text-[10px] text-slate-500 truncate">
            Room: {entry.resourceName}
          </p>
        )}
      </div>

      {/* Quick Actions in Edit Mode */}
      {isEditMode && (
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/80">
          {/* Lock / Unlock button */}
          {!entry.isFixed ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock(entry);
              }}
              className="text-[10px] text-slate-400 hover:text-indigo-300 transition flex items-center gap-1"
              title={entry.isLocked ? "Unlock period" : "Lock period"}
            >
              <Lock className={`w-3 h-3 ${entry.isLocked ? "text-indigo-400" : ""}`} />
              <span>{entry.isLocked ? "Unlock" : "Lock"}</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-600">Fixed</span>
          )}

          <div className="flex items-center space-x-1">
            {/* Mobile / Click-based Move */}
            {!isLocked && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMoveDialog(entry);
                }}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                title="Move period dialog"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {/* Remove */}
            {!entry.isFixed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(entry);
                }}
                className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                title="Remove period"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
