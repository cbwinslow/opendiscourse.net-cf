import os
import json
from pathlib import Path
from typing import Dict, Any

from src.transcribe.transcribe import transcribe_file


BUCKET_DIR = Path(os.environ.get("LOCAL_BUCKET_DIR", "./buckets"))
BUCKET_DIR.mkdir(parents=True, exist_ok=True)


def save_raw(source: str, handle: str, payload: Dict[str, Any]) -> str:
    fname = f"{source}_{handle}_{int(os.times()[4])}.json"
    import os
    import json
    from pathlib import Path
    from typing import Dict, Any

    from src.transcribe.transcribe import transcribe_file


    BUCKET_DIR = Path(os.environ.get("LOCAL_BUCKET_DIR", "./buckets"))
    BUCKET_DIR.mkdir(parents=True, exist_ok=True)


    def save_raw(source: str, handle: str, payload: Dict[str, Any]) -> str:
        fname = f"{source}_{handle}_{int(os.times()[4])}.json"
        path = BUCKET_DIR / fname
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f)
        return str(path)


    def ingest_x_sample(handle: str) -> None:
        from src.ingest.x_ingest import fetch_latest_by_handle, normalize_x_payload

        raw = fetch_latest_by_handle(handle)
        norm = normalize_x_payload(raw)
        saved = save_raw("x", handle, norm)
        print("Saved raw to", saved)


    def ingest_youtube_sample(video_id: str) -> None:
        from src.ingest.youtube_ingest import fetch_video_metadata

        raw = fetch_video_metadata(video_id)
        saved = save_raw("youtube", video_id, raw)
        print("Saved raw to", saved)
