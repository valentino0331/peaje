from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class PaymentMethod(str, Enum):
    POS_CARD = "POS_CARD"       # Simulación de tarjeta física chip / contactless
    YAPE_QR = "YAPE_QR"         # QR dinámico de demostración Yape
    PLIN_QR = "PLIN_QR"         # QR dinámico de demostración Plin
    CASH = "CASH"               # Efectivo cabina

class TransactionStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"

class TransactionCreate(BaseModel):
    event_id: str
    category: str
    tariff: float
    license_plate: Optional[str] = "P3X-892"
    station_id: Optional[str] = "PEAJE-PIURA-CENTRO"
    lane_id: Optional[str] = "CARRIL-01"

class TransactionResponse(BaseModel):
    transaction_id: str
    event_id: str
    category: str
    tariff: float
    license_plate: Optional[str] = None
    status: TransactionStatus
    payment_method: Optional[PaymentMethod] = None
    created_at: str
    paid_at: Optional[str] = None
    auth_code: Optional[str] = None
    idempotency_key: str

class PaymentProcessRequest(BaseModel):
    transaction_id: str
    payment_method: PaymentMethod
    simulated_success: bool = True
    card_type: Optional[str] = "VISA"
    operator_id: Optional[str] = "OP-PIURA-01"

class PaymentProcessResponse(BaseModel):
    transaction_id: str
    event_id: str
    status: TransactionStatus
    amount: float
    payment_method: PaymentMethod
    auth_code: str
    message: str
    gate_unlocked: bool
    paid_at: str
