"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { TimetableEntry } from "@/types";
import { DroppableCell } from "./DroppableCell";
import { TimetableEditConflict } from "@/types/timetableEdit";
import { timetableEditService } from "@/services/timetableEditService";
import { useToast } from "@/components/Toast";
import { ConflictModal } from "./ConflictModal";
import { Layers } from "lucide-react";

interface EditableTimetableGridProps {
  timetableId: string;
  isEditMode: boolean;
  currentRevision: number;
  workingDays: { id: string; name: string; dayOrder: number }[];
  timeSlots: {
    id: string;
    name: string;
    slotOrder: number;
    startTime: string;
    endTime: string;
    isBreak: boolean;
    isLunch: boolean;
  }[];
  matrixMap: Map<string, TimetableEntry>;
  onRefreshData: () => void;
  onOpenDetails: (entry: TimetableEntry) => void;
  onOpenMoveDialog: (entry: TimetableEntry) => void;
  onOpenSwapDialog: (first: TimetableEntry, second: TimetableEntry) => void;
  onOpenAddModal: (dayId: string, dayName: string, slotId: string, slotName: string) => void;
  onOpenRemoveModal: (entry: TimetableEntry) => void;
  onToggleLock: (entry: TimetableEntry) => void;
}

export function EditableTimetableGrid({
  timetableId,
  isEditMode,
  currentRevision,
  workingDays,
  timeSlots,
  matrixMap,
  onRefreshData,
  onOpenDetails,
  onOpenMoveDialog,
  onOpenSwapDialog,
  onOpenAddModal,
  onOpenRemoveModal,
  onToggleLock,
}: EditableTimetableGridProps) {
  const toast = useToast();
  const [activeEntry, setActiveEntry] = useState<TimetableEntry | null>(null);

  // Conflicts modal on dropped move
  const [conflictModalOpen, setConflictModalOpen] = useState<boolean>(false);
  const [activeConflicts, setActiveConflicts] = useState<TimetableEditConflict[]>([]);
  const [activeWarnings, setActiveWarnings] = useState<string[]>([]);

  // Configure pointer sensor with small activation distance to allow clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const entry = event.active.data.current?.entry as TimetableEntry;
    if (entry) {
      setActiveEntry(entry);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveEntry(null);

    if (!over || !active) return;

    const sourceEntry = active.data.current?.entry as TimetableEntry;
    const overData = over.data.current as {
      dayId: string;
      slotId: string;
      entry: TimetableEntry | null;
    };

    if (!sourceEntry || !overData) return;

    const targetDayId = overData.dayId;
    const targetSlotId = overData.slotId;
    const targetEntry = overData.entry;

    // Dropped on same slot
    if (sourceEntry.workingDayId === targetDayId && sourceEntry.timeSlotId === targetSlotId) {
      return;
    }

    // 1. If target cell is already occupied -> Offer atomic SWAP!
    if (targetEntry) {
      onOpenSwapDialog(sourceEntry, targetEntry);
      return;
    }

    // 2. Target cell is empty -> Preview Move via backend
    try {
      toast.showToast("Validating period move...", "info");
      const preview = await timetableEditService.previewMove(timetableId, {
        entryId: sourceEntry.id,
        targetWorkingDayId: targetDayId,
        targetTimeSlotId: targetSlotId,
      });

      if (!preview.valid) {
        setActiveConflicts(preview.conflicts);
        setActiveWarnings(preview.warnings);
        setConflictModalOpen(true);
        return;
      }

      // 3. Move is valid -> Apply Move with optimistic revision check
      await timetableEditService.applyMove(timetableId, sourceEntry.id, {
        targetWorkingDayId: targetDayId,
        targetTimeSlotId: targetSlotId,
        expectedRevision: currentRevision,
      });

      toast.showToast(
        `Successfully moved '${sourceEntry.subjectName || sourceEntry.title}'!`,
        "success"
      );
      onRefreshData();
    } catch (err: unknown) {
      toast.showToast(
        err instanceof Error ? err.message : "Failed to move timetable period",
        "error"
      );
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40 shadow-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800">
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-28 sticky left-0 bg-slate-900 z-20">
                  Day / Period
                </th>
                {timeSlots.map((slot) => (
                  <th
                    key={slot.id}
                    className={`py-3 px-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[140px] border-l border-slate-800/80 ${
                      slot.isLunch || slot.isBreak
                        ? "text-slate-500 bg-slate-950/60"
                        : "text-slate-300"
                    }`}
                  >
                    <div>{slot.name}</div>
                    <div className="text-[10px] font-normal text-slate-500 lowercase">
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {workingDays.map((day) => (
                <tr key={day.id} className="hover:bg-slate-900/20 transition-colors">
                  {/* Day header sticky left */}
                  <td className="py-3 px-4 text-xs font-semibold text-white bg-slate-900/80 border-r border-slate-800 sticky left-0 z-10">
                    {day.name}
                  </td>

                  {/* Period cells */}
                  {timeSlots.map((slot) => {
                    const key = `${day.id}_${slot.id}`;
                    const entry = matrixMap.get(key) || null;

                    return (
                      <td
                        key={slot.id}
                        className="p-1.5 border-l border-slate-800/60 align-top"
                      >
                        <DroppableCell
                          dayId={day.id}
                          dayName={day.name}
                          slotId={slot.id}
                          slotName={slot.name}
                          isTeachingSlot={!slot.isBreak && !slot.isLunch}
                          isBreak={slot.isBreak}
                          isLunch={slot.isLunch}
                          entry={entry}
                          isEditMode={isEditMode}
                          onOpenDetails={onOpenDetails}
                          onOpenMoveDialog={onOpenMoveDialog}
                          onToggleLock={onToggleLock}
                          onRemove={onOpenRemoveModal}
                          onAddEntryClick={onOpenAddModal}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Drag Overlay during movement */}
        <DragOverlay dropAnimation={null}>
          {activeEntry ? (
            <div className="w-48 p-3 rounded-xl bg-slate-900 border-2 border-indigo-500 shadow-2xl text-xs text-white opacity-95">
              <div className="font-semibold truncate">
                {activeEntry.subjectName || activeEntry.title}
              </div>
              <div className="text-[11px] text-slate-400">
                {activeEntry.facultyNames?.join(", ")}
              </div>
              {(activeEntry.blockSize || 1) > 1 && (
                <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-violet-300 bg-violet-950/60 px-1.5 py-0.5 rounded">
                  <Layers className="w-2.5 h-2.5" />
                  {activeEntry.blockSize}-Period Block Moving
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Conflict Dialog */}
      <ConflictModal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        conflicts={activeConflicts}
        warnings={activeWarnings}
      />
    </>
  );
}
