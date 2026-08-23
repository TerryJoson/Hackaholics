from io import BytesIO

from fastapi import FastAPI, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from dotenv import load_dotenv

from mock_model import detect_anatomy, estimate_measurements
from heatmap_generator import generate_overlay
from ai_copilot import ask_copilot
from report_generator import build_report
from oa_classifier import predict_oa_grade

load_dotenv()

app = FastAPI(title="Knee OA AI Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

REFERENCE = {
    "ant": {"mean": 2.8, "sd": 1.1},
    "mid": {"mean": 2.6, "sd": 1.0},
    "post": {"mean": 2.7, "sd": 1.1},
}

IMPLANTS = [
    {"size": 1, "ideal": 58},
    {"size": 2, "ideal": 61},
    {"size": 3, "ideal": 64},
    {"size": 4, "ideal": 67},
    {"size": 5, "ideal": 70},
    {"size": 6, "ideal": 73},
]


def match_score(width: float, ideal: float) -> int:
    return max(0, round(100 - abs(width - ideal) * 8))


def best_implant(width: float):
    scored = [{"size": im["size"], "score": match_score(width, im["ideal"])} for im in IMPLANTS]
    best = max(scored, key=lambda x: x["score"])
    return best, scored


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...), age: int = Form(62), sex: str = Form("Male")):
    """Steps 1-3: upload, mock anatomy detection, measurement."""
    contents = await file.read()
    image = Image.open(BytesIO(contents)).convert("RGB")

    regions = detect_anatomy(image)              # TODO: swap for real nnU-Net masks
    measurements = estimate_measurements(image)   # TODO: compute from real masks
    overlay_b64 = generate_overlay(image, regions)
    oa_result = predict_oa_grade(image)           # real trained model — actual prediction

    return {
        "age": age,
        "sex": sex,
        "regions": regions,
        "measurements": measurements,
        "reference": REFERENCE,
        "overlay_image": overlay_b64,
        "oa_result": oa_result,
    }


@app.post("/api/implant-match")
async def implant_match(plateau_width: float = Form(...)):
    """Step 4/5: real nearest-fit implant matching, not mocked."""
    best, all_scores = best_implant(plateau_width)
    return {"recommended": best, "all_scores": all_scores}


@app.post("/api/whatif")
async def whatif(plateau_width: float = Form(...), size: int = Form(...)):
    """Step 6: recompute fit + overhang risk for a manually chosen size."""
    implant = next(im for im in IMPLANTS if im["size"] == size)
    score = match_score(plateau_width, implant["ideal"])
    overhang = abs(plateau_width - implant["ideal"]) > 4
    return {"size": size, "score": score, "overhang": overhang}


@app.post("/api/copilot")
async def copilot(question: str = Form(...), context: str = Form(...)):
    """Step 7: Claude explains the already-computed numbers. Server-side call
    so the API key never reaches the browser."""
    answer = ask_copilot(question, context)
    return {"answer": answer}


@app.post("/api/report")
async def report(payload: dict = Body(...)):
    """Step 8: structured summary; frontend renders it and uses
    window.print() to save as PDF."""
    return build_report(payload)
