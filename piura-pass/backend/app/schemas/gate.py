from enum import Enum
from typing import Optional
from pydantic import BaseModel

class GateStatus(str, Enum):
    CLOSED = "CLOSED"
    OPENING = "OPENING"
    OPEN = "OPEN"
    CLOSING = "CLOSING"
    ERROR = "ERROR"

class GateOpenRequest(BaseModel):
    transaction_id: str
    lane_id: str = "CARRIL-01"
    station_id: str = "PEAJE-PIURA-CENTRO"
    auto_close_seconds: int = 5

class GateStatusResponse(BaseModel):
    lane_id: str
    status: GateStatus
    is_open: bool
    last_event_id: Optional[str] = None
    last_transaction_id: Optional[str] = None
    opened_at: Optional[str] = None
    auto_close_seconds: int = 5
    message: str
