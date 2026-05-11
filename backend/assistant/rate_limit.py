from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, status

from config import get_settings

_buckets: dict[int, deque[float]] = defaultdict(deque)


def enforce_assistant_rate_limit(user_id: int) -> None:
    settings = get_settings()
    limit = max(1, settings.assistant_rate_limit_per_minute)
    now = time.time()
    bucket = _buckets[user_id]
    while bucket and now - bucket[0] > 60:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Assistant rate limit exceeded. Please wait a moment and try again.",
        )
    bucket.append(now)
