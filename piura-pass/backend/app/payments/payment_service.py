import time
from datetime import datetime, timezone
from typing import Dict, Optional, List
from uuid import uuid4

from app.schemas.payment import (
    PaymentMethod,
    TransactionStatus,
    TransactionCreate,
    TransactionResponse,
    PaymentProcessRequest,
    PaymentProcessResponse,
)
from app.core.logger import logger
from app.websocket.manager import ws_manager

class PaymentService:
    """
    Servicio desacoplado de pagos digitales y POS para PIURA PASS.
    Maneja máquina de estados, idempotencia y autorización de paso en carril.
    """

    def __init__(self):
        self.transactions: Dict[str, TransactionResponse] = {}

    def create_transaction(self, req: TransactionCreate) -> TransactionResponse:
        tx_id = f"TX-PIURA-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
        idempotency_key = f"IDEMP-{uuid4().hex[:12]}"
        now_ts = datetime.now(timezone.utc).isoformat()

        tx = TransactionResponse(
            transaction_id=tx_id,
            event_id=req.event_id,
            category=req.category,
            tariff=req.tariff,
            license_plate=req.license_plate,
            status=TransactionStatus.PENDING,
            payment_method=None,
            created_at=now_ts,
            paid_at=None,
            auth_code=None,
            idempotency_key=idempotency_key,
        )
        self.transactions[tx_id] = tx
        logger.info(f"Transacción creada: {tx_id} para evento {req.event_id} | Monto: S/ {req.tariff:.2f}")
        return tx

    async def process_payment(self, req: PaymentProcessRequest) -> PaymentProcessResponse:
        tx = self.transactions.get(req.transaction_id)
        if not tx:
            raise ValueError(f"Transacción {req.transaction_id} no encontrada.")

        if tx.status == TransactionStatus.PAID:
            # Idempotencia: ya está pagada
            return PaymentProcessResponse(
                transaction_id=tx.transaction_id,
                event_id=tx.event_id,
                status=TransactionStatus.PAID,
                amount=tx.tariff,
                payment_method=tx.payment_method or req.payment_method,
                auth_code=tx.auth_code or "AUTH-REPLAY",
                message="Transacción ya confirmada previamente (Idempotente).",
                gate_unlocked=True,
                paid_at=tx.paid_at or datetime.now(timezone.utc).isoformat(),
            )

        now_ts = datetime.now(timezone.utc).isoformat()

        if not req.simulated_success:
            tx.status = TransactionStatus.FAILED
            return PaymentProcessResponse(
                transaction_id=tx.transaction_id,
                event_id=tx.event_id,
                status=TransactionStatus.FAILED,
                amount=tx.tariff,
                payment_method=req.payment_method,
                auth_code="DENIED-REJECTED",
                message="Pago rechazado por emisor o fondos insuficientes.",
                gate_unlocked=False,
                paid_at="",
            )

        # Generar código de autorización realista según pasarela
        if req.payment_method == PaymentMethod.POS_CARD:
            auth_code = f"POS-{req.card_type or 'VISA'}-{uuid4().hex[:6].upper()}"
        elif req.payment_method == PaymentMethod.YAPE_QR:
            auth_code = f"YAPE-BCP-{uuid4().hex[:6].upper()}"
        elif req.payment_method == PaymentMethod.PLIN_QR:
            auth_code = f"PLIN-BBVA-{uuid4().hex[:6].upper()}"
        else:
            auth_code = f"CASH-CABINA-{uuid4().hex[:6].upper()}"

        tx.status = TransactionStatus.PAID
        tx.payment_method = req.payment_method
        tx.paid_at = now_ts
        tx.auth_code = auth_code

        logger.info(
            f"Pago confirmado exitosamente: {tx.transaction_id} | Método: {req.payment_method.value} | "
            f"Monto: S/ {tx.tariff:.2f} | Auth: {auth_code}"
        )

        # Notificar por WebSocket que el pago está confirmado y autorizar tranquera
        await ws_manager.broadcast({
            "type": "PAYMENT_CONFIRMED",
            "transaction_id": tx.transaction_id,
            "event_id": tx.event_id,
            "amount": tx.tariff,
            "license_plate": tx.license_plate,
            "payment_method": req.payment_method.value,
            "auth_code": auth_code,
            "gate_unlocked": True,
            "timestamp": now_ts,
        })

        return PaymentProcessResponse(
            transaction_id=tx.transaction_id,
            event_id=tx.event_id,
            status=TransactionStatus.PAID,
            amount=tx.tariff,
            payment_method=req.payment_method,
            auth_code=auth_code,
            message="Pago verificado y validado exitosamente. Tranquera autorizada para apertura.",
            gate_unlocked=True,
            paid_at=now_ts,
        )

    def get_transaction(self, tx_id: str) -> Optional[TransactionResponse]:
        return self.transactions.get(tx_id)

    def get_all_transactions(self, limit: int = 50) -> List[TransactionResponse]:
        return list(self.transactions.values())[-limit:]

payment_service = PaymentService()
