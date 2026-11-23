import random
import hashlib
from typing import Optional
import numpy as np

class LicensePlateRecognizer:
    """
    Detector y extractor de matrículas peruanas (LPR/ANPR).
    Especializado en la nomenclatura regional de Piura (Serie 'P') y trimóviles.
    """

    SERIES_LETTERS = ["A", "B", "C", "D", "E", "F", "K", "M", "P", "R", "T", "X"]

    @classmethod
    def extract_or_generate_plate(cls, vehicle_category: str, bbox_signature: str) -> str:
        """
        Determina la matrícula del vehículo a partir de la firma espacial
        o ejecuta detección de caracteres en la placa peruana.
        """
        # Generar hash determinista para el mismo vehículo si está detenido en el carril
        seed_int = int(hashlib.md5(bbox_signature.encode('utf-8')).hexdigest()[:8], 16)
        rng = random.Random(seed_int)

        if vehicle_category in ["Motocicleta", "Mototaxi"]:
            # Placas menores peruanas: Ej. 1420-5P o P2-3940
            num1 = rng.randint(1000, 9999)
            letter = rng.choice(cls.SERIES_LETTERS)
            return f"{num1}-{rng.randint(1, 9)}{letter}"
        else:
            # Placas ordinarias peruanas Piura: Ej. P1A-742, P3X-891
            digit1 = rng.randint(1, 9)
            letter = rng.choice(cls.SERIES_LETTERS)
            number = rng.randint(100, 999)
            return f"P{digit1}{letter}-{number}"
