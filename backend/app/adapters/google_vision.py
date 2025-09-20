import base64
from typing import Any, Dict, Tuple

import httpx
from fastapi import HTTPException

from ..config import settings
from ..services.types import SpineResult
from .nvidia_model import NIMAdapter

API = "https://vision.googleapis.com/v1/images:annotate"


class GoogleVisionAdapter:
    def __init__(self):
        if not settings.GOOGLEBOOKS_API_KEY and not settings.GOOGLE_VISION_API_KEY:
            # support either GOOGLE_VISION_API_KEY or legacy var
            print(
                "Warning: GOOGLE_VISION_API_KEY missing - Google Vision will not work"
            )
            self.key = None
        else:
            self.key = settings.GOOGLE_VISION_API_KEY

        # Initialize NVIDIA NIM adapter for text processing
        self.nim_adapter = NIMAdapter()

    async def scan(self, image_bytes: bytes) -> Tuple[SpineResult, Dict[str, Any]]:
        if not self.key:
            raise HTTPException(
                status_code=503, detail="Google Vision API key not configured"
            )

        # Step 1: Get OCR text and bounding boxes from Google Vision
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        body = {
            "requests": [
                {
                    "image": {"content": b64},
                    "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(f"{API}?key={self.key}", json=body)
                r.raise_for_status()
                data = r.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"gcv_http:{e.response.text[:200]}",
            )
        except Exception as e:
            raise HTTPException(
                status_code=502, detail=f"gcv_error:{e.__class__.__name__}"
            )

        try:
            ann = data["responses"][0]
            tanns = ann.get("textAnnotations") or []

            # Extract text fragments with bounding boxes
            candidates = []
            print(f"DEBUG: Google Vision found {len(tanns)} text annotations")
            if len(tanns) > 1:  # Skip first element (full text)
                for i, t_ann in enumerate(tanns[1:]):
                    text = t_ann.get("description", "").strip()
                    if text and len(text) > 2:
                        # Get bounding box and normalize coordinates
                        vertices = t_ann.get("boundingPoly", {}).get("vertices", [])
                        if len(vertices) >= 2:
                            # Calculate normalized bounding box
                            x_coords = [v.get("x", 0) for v in vertices]
                            y_coords = [v.get("y", 0) for v in vertices]

                            # Get image dimensions from full text annotation
                            full_vertices = (
                                tanns[0].get("boundingPoly", {}).get("vertices", [])
                            )
                            if len(full_vertices) >= 2:
                                img_width = max(v.get("x", 0) for v in full_vertices)
                                img_height = max(v.get("y", 0) for v in full_vertices)

                                if img_width > 0 and img_height > 0:
                                    x = min(x_coords) / img_width
                                    y = min(y_coords) / img_height
                                    w = (max(x_coords) - min(x_coords)) / img_width
                                    h = (max(y_coords) - min(y_coords)) / img_height

                                    candidates.append(
                                        {
                                            "text": text,
                                            "bbox": {"x": x, "y": y, "w": w, "h": h},
                                        }
                                    )
                                    print(
                                        f"DEBUG: Candidate {i}: '{text}' at bbox({x:.3f}, {y:.3f}, {w:.3f}, {h:.3f})"
                                    )

            print(f"DEBUG: Total candidates for NVIDIA NIM: {len(candidates)}")
            print(f"DEBUG: First 5 candidates: {candidates[:5]}")

            # Step 2: Send to NVIDIA NIM for structured parsing
            if candidates:
                result = await self.nim_adapter.aggregate(candidates)
                return result, {"gcv_units": 1, "nvidia_units": 1}
            else:
                raise RuntimeError("No text candidates found for NVIDIA NIM processing")

        except Exception as e:
            print(f"Google Vision processing failed: {e}")
            raise RuntimeError(f"Google Vision + NVIDIA NIM processing failed: {e}")
