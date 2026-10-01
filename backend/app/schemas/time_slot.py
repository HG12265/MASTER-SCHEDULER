import re
from typing import Optional
from pydantic import BaseModel, Field, model_validator
from app.schemas.common import BaseEntity

TIME_REGEX = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


class TimeSlotBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="e.g. Period 1, Lunch Break")
    startTime: str = Field(..., description="Start time in HH:MM format (24-hour), e.g. 09:30")
    endTime: str = Field(..., description="End time in HH:MM format (24-hour), e.g. 10:30")
    slotOrder: int = Field(..., ge=1, description="Sequential ordering of the slot")
    slotType: str = Field("PERIOD", description="Slot type: PERIOD, BREAK, LUNCH, etc.")
    isTeachingSlot: bool = Field(True, description="False for breaks/lunch; true for classes")
    isActive: bool = Field(True, description="Record active status")

    @model_validator(mode="after")
    def validate_slot_times(self):
        self.name = self.name.strip()
        self.startTime = self.startTime.strip()
        self.endTime = self.endTime.strip()
        self.slotType = self.slotType.strip().upper()

        if not TIME_REGEX.match(self.startTime):
            raise ValueError(f"Invalid startTime format '{self.startTime}', expected HH:MM (24-hour)")
        if not TIME_REGEX.match(self.endTime):
            raise ValueError(f"Invalid endTime format '{self.endTime}', expected HH:MM (24-hour)")

        if self.startTime >= self.endTime:
            raise ValueError(f"startTime ({self.startTime}) must be strictly before endTime ({self.endTime})")

        # Automatically mark non-period slots as non-teaching slots if not explicitly specified
        if self.slotType in ("BREAK", "LUNCH") and self.isTeachingSlot:
            self.isTeachingSlot = False

        return self


class TimeSlotCreate(TimeSlotBase):
    pass


class TimeSlotUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    slotOrder: Optional[int] = Field(None, ge=1)
    slotType: Optional[str] = None
    isTeachingSlot: Optional[bool] = None
    isActive: Optional[bool] = None

    @model_validator(mode="after")
    def validate_update(self):
        if self.name is not None:
            self.name = self.name.strip()
        if self.slotType is not None:
            self.slotType = self.slotType.strip().upper()
        if self.startTime is not None:
            self.startTime = self.startTime.strip()
            if not TIME_REGEX.match(self.startTime):
                raise ValueError("Invalid startTime format, expected HH:MM")
        if self.endTime is not None:
            self.endTime = self.endTime.strip()
            if not TIME_REGEX.match(self.endTime):
                raise ValueError("Invalid endTime format, expected HH:MM")

        if self.startTime is not None and self.endTime is not None:
            if self.startTime >= self.endTime:
                raise ValueError("startTime must be strictly before endTime")

        return self


class TimeSlotResponse(BaseEntity, TimeSlotBase):
    pass
