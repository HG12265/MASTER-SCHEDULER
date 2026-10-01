from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Path, Query, status
from app.schemas.common import DataResponse
from app.schemas.timetable import (
    MovePreviewRequest,
    MovePreviewResponse,
    ApplyMoveRequest,
    SwapPreviewRequest,
    SwapPreviewResponse,
    ApplySwapRequest,
    ManualEntryCreateRequest,
    RegenerationPreviewRequest,
    RegenerationPreviewResponse,
    ApplyRegenerationRequest,
    TimetableChangeHistoryResponse,
    TimetableValidationReport,
    UndoRequest,
)
from app.services.timetable_edit_service import timetable_edit_service
from app.scheduler.partial_engine import partial_regeneration_engine

router = APIRouter(prefix="/timetables", tags=["Timetable Editing & Partial Regeneration"])


@router.post(
    "/{id}/edit/preview-move",
    response_model=DataResponse[MovePreviewResponse],
    summary="Preview period movement conflicts without mutating database",
)
async def preview_move(
    id: str = Path(..., description="Timetable ID"),
    payload: MovePreviewRequest = ...,
):
    result = await timetable_edit_service.preview_move(id, payload)
    return DataResponse(
        message=result.message,
        data=result,
    )


@router.patch(
    "/{id}/entries/{entryId}/move",
    response_model=DataResponse[Dict[str, Any]],
    summary="Apply validated period move with optimistic concurrency check",
)
async def apply_move(
    id: str = Path(..., description="Timetable ID"),
    entryId: str = Path(..., description="Entry ID"),
    payload: ApplyMoveRequest = ...,
):
    result = await timetable_edit_service.apply_move(id, entryId, payload)
    return DataResponse(
        message=result["message"],
        data=result,
    )


@router.post(
    "/{id}/edit/preview-swap",
    response_model=DataResponse[SwapPreviewResponse],
    summary="Preview period swap conflicts without mutating database",
)
async def preview_swap(
    id: str = Path(..., description="Timetable ID"),
    payload: SwapPreviewRequest = ...,
):
    result = await timetable_edit_service.preview_swap(id, payload)
    return DataResponse(
        message=result.message,
        data=result,
    )


@router.post(
    "/{id}/edit/swap",
    response_model=DataResponse[Dict[str, Any]],
    summary="Apply validated period swap atomically with optimistic concurrency",
)
async def apply_swap(
    id: str = Path(..., description="Timetable ID"),
    payload: ApplySwapRequest = ...,
):
    result = await timetable_edit_service.apply_swap(id, payload)
    return DataResponse(
        message=result["message"],
        data=result,
    )


@router.post(
    "/{id}/entries",
    response_model=DataResponse[Dict[str, Any]],
    status_code=status.HTTP_201_CREATED,
    summary="Manually assign subject/activity to an empty slot",
)
async def manual_add_entry(
    id: str = Path(..., description="Timetable ID"),
    payload: ManualEntryCreateRequest = ...,
):
    result = await timetable_edit_service.manual_add_entry(id, payload)
    return DataResponse(
        message=result["message"],
        data=result,
    )


@router.delete(
    "/{id}/entries/{entryId}",
    response_model=DataResponse[Dict[str, Any]],
    summary="Remove a scheduled entry from draft timetable",
)
async def remove_entry(
    id: str = Path(..., description="Timetable ID"),
    entryId: str = Path(..., description="Entry ID to delete"),
    expectedRevision: int = Query(..., description="Expected revision"),
):
    result = await timetable_edit_service.remove_entry(id, entryId, expectedRevision)
    return DataResponse(
        message=result["message"],
        data=result,
    )


@router.patch(
    "/{id}/entries/{entryId}/lock",
    response_model=DataResponse[Dict[str, Any]],
    summary="Manually lock a generated entry to prevent movement or partial regeneration",
)
async def lock_entry(
    id: str = Path(..., description="Timetable ID"),
    entryId: str = Path(..., description="Entry ID"),
):
    result = await timetable_edit_service.lock_entry(id, entryId)
    return DataResponse(
        message=result["message"],
        data=result,
    )


@router.patch(
    "/{id}/entries/{entryId}/unlock",
    response_model=DataResponse[Dict[str, Any]],
    summary="Unlock a manually locked entry",
)
async def unlock_entry(
    id: str = Path(..., description="Timetable ID"),
    entryId: str = Path(..., description="Entry ID"),
):
    result = await timetable_edit_service.unlock_entry(id, entryId)
    return DataResponse(
        message=result["message"],
        data=result,
    )


@router.post(
    "/{id}/regenerate/preview",
    response_model=DataResponse[RegenerationPreviewResponse],
    summary="Preview partial regeneration diff using OR-Tools CP-SAT without modifying timetable",
)
async def preview_regeneration(
    id: str = Path(..., description="Timetable ID"),
    payload: RegenerationPreviewRequest = ...,
):
    solver_opts = payload.solverOptions
    max_seconds = solver_opts.maxSolveSeconds if solver_opts else 20
    num_workers = getattr(solver_opts, "numWorkers", 4) if solver_opts else 4

    result = await partial_regeneration_engine.preview_regeneration(
        timetable_id=id,
        scope=payload.scope,
        preserve_locked_entries=payload.preserveLockedEntries,
        max_solve_seconds=max_seconds,
        num_workers=num_workers,
    )
    return DataResponse(
        message=result.message,
        data=result,
    )


@router.post(
    "/{id}/regenerate/apply",
    response_model=DataResponse[Dict[str, Any]],
    summary="Apply validated partial regeneration preview with token and revision check",
)
async def apply_regeneration(
    id: str = Path(..., description="Timetable ID"),
    payload: ApplyRegenerationRequest = ...,
):
    result = await partial_regeneration_engine.apply_regeneration(
        timetable_id=id,
        preview_token=payload.previewToken,
        expected_revision=payload.expectedRevision,
    )
    return DataResponse(
        message=result["message"],
        data=result,
    )


@router.get(
    "/{id}/history",
    response_model=DataResponse[List[TimetableChangeHistoryResponse]],
    summary="Get timetable change history audit trail",
)
async def get_history(
    id: str = Path(..., description="Timetable ID"),
):
    history = await timetable_edit_service.get_history(id)
    return DataResponse(
        message="History retrieved successfully",
        data=history,
    )


@router.post(
    "/{id}/history/{changeId}/undo",
    response_model=DataResponse[Dict[str, Any]],
    summary="Undo a previous change and restore snapshot atomically",
)
async def undo_change(
    id: str = Path(..., description="Timetable ID"),
    changeId: str = Path(..., description="Change History ID"),
    payload: UndoRequest = ...,
):
    result = await timetable_edit_service.undo_change(
        timetable_id=id,
        change_id=changeId,
        expected_revision=payload.expectedRevision,
    )
    return DataResponse(
        message=result["message"],
        data=result,
    )


@router.post(
    "/{id}/validate",
    response_model=DataResponse[TimetableValidationReport],
    summary="Validate entire saved timetable state against all hard and soft constraints",
)
async def validate_timetable(
    id: str = Path(..., description="Timetable ID"),
):
    report = await timetable_edit_service.validate_timetable(id)
    return DataResponse(
        message=f"Timetable validated with status: {report.status}",
        data=report,
    )
