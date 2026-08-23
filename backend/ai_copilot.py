"""
Calls the Claude API server-side so the API key never reaches the
browser. Feeds it the numbers already computed elsewhere in the
pipeline so it explains real data instead of guessing.

Requires ANTHROPIC_API_KEY to be set in backend/.env
(see .env.example).
"""
import os

import requests

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
API_URL = "https://api.anthropic.com/v1/messages"

SYSTEM_PROMPT = (
    "You are a clinical decision-support copilot explaining knee OA "
    "X-ray analysis results to a clinician. Use only the data given "
    "in the context below. Be concise (3-5 sentences), plain "
    "language, no markdown headers. This is a research/decision-"
    "support tool, not a diagnosis."
)


def ask_copilot(question: str, context: str) -> str:
    if not ANTHROPIC_API_KEY:
        return "Copilot is not configured — set ANTHROPIC_API_KEY in backend/.env"

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": "claude-sonnet-4-6",
        "max_tokens": 300,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": f"{context}\n\nQuestion: {question}"}],
    }

    try:
        resp = requests.post(API_URL, headers=headers, json=body, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return "".join(block.get("text", "") for block in data.get("content", []))
    except Exception as exc:  # keep the demo alive even if the API call fails
        return f"Copilot unavailable right now ({exc})"
