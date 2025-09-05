# backend/app/services/metrics.py
import time

from prometheus_client import Counter, Histogram

# Vision processing metrics
vision_requests_total = Counter(
    "vision_requests_total",
    "Total number of vision processing requests",
    ["provider", "status"],  # provider: groq|gcv, status: success|error
)

vision_request_duration_seconds = Histogram(
    "vision_request_duration_seconds",
    "Time spent processing vision requests",
    ["provider"],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, float("inf")),
)

vision_cache_hits_total = Counter(
    "vision_cache_hits_total", "Total number of vision cache hits"
)

vision_spines_detected_total = Counter(
    "vision_spines_detected_total", "Total number of book spines detected", ["provider"]
)

# Image processing metrics
image_processing_total = Counter(
    "image_processing_total",
    "Total number of images processed",
    ["action"],  # action: downscaled|kept_original|format_converted
)

image_size_bytes = Histogram(
    "image_size_bytes",
    "Size of processed images in bytes",
    buckets=(
        1024,
        10 * 1024,
        100 * 1024,
        1024 * 1024,
        5 * 1024 * 1024,
        10 * 1024 * 1024,
        float("inf"),
    ),
)

# Cost tracking
vision_spend_usd_total = Counter(
    "vision_spend_usd_total", "Total spend on vision APIs in USD", ["provider"]
)


class VisionMetrics:
    """Helper class to track vision processing metrics"""

    def __init__(self, provider: str):
        self.provider = provider
        self.start_time = time.time()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        vision_request_duration_seconds.labels(provider=self.provider).observe(duration)

        if exc_type is None:
            vision_requests_total.labels(provider=self.provider, status="success").inc()
        else:
            vision_requests_total.labels(provider=self.provider, status="error").inc()

    def record_spines_detected(self, count: int):
        """Record number of spines detected"""
        vision_spines_detected_total.labels(provider=self.provider).inc(count)


def record_cache_hit():
    """Record a cache hit"""
    vision_cache_hits_total.inc()


def record_image_processing(action: str, size_bytes: int):
    """Record image processing action and size"""
    image_processing_total.labels(action=action).inc()
    image_size_bytes.observe(size_bytes)


def record_vision_spend(provider: str, cost_usd: float):
    """Record vision API spend"""
    vision_spend_usd_total.labels(provider=provider).inc(cost_usd)
