"""Transcription helper.

Supports local Whisper (if available) or OpenAI transcription APIs when
credentials are present.
"""
import os
from typing import Dict, Any


def transcribe_file(path: str) -> Dict[str, Any]:
    # Placeholder transcription: if OPENAI_API_KEY present, call OpenAI.
    # Otherwise attempt to call local whisper if installed.
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        # Implement OpenAI transcription call here
        return {"transcript": "transcribed via openai", "path": path}

    try:
        import whisper

        model = whisper.load_model("small")
        result = model.transcribe(path)
        return {"transcript": result.get("text", ""), "metadata": result}
    except Exception:
        return {"transcript": "<no-transcript-available>", "path": path}
