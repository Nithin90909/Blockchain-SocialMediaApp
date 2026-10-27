from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model.classifier import FakeNewsClassifier
from model.url_checker import analyze_urls_in_text, analyze_url
from model.image_analyzer import analyze_image
from model.trusted_sources import get_all_sources
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DecentraSocial ML Service",
    description="Fake news detection, credibility scoring, URL analysis, and image verification API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

classifier = FakeNewsClassifier()


class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    credibility_score: int
    label: str
    confidence: float
    url_analysis: dict | None = None


class URLCheckRequest(BaseModel):
    url: str


class TrainRequest(BaseModel):
    texts: list[str]
    labels: list[int]


@app.on_event("startup")
async def startup():
    classifier.load_or_train()
    logger.info("ML model loaded successfully")


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": classifier.is_loaded()}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if len(request.text) < 10:
        raise HTTPException(status_code=400, detail="Text too short for analysis")

    result = classifier.predict(request.text)

    url_analysis = analyze_urls_in_text(request.text)

    final_score = result["credibility_score"]
    if url_analysis["urls_found"] > 0 and url_analysis["avg_score"] >= 0:
        url_weight = 0.3
        final_score = int(
            result["credibility_score"] * (1 - url_weight)
            + url_analysis["avg_score"] * url_weight
        )

    return AnalyzeResponse(
        credibility_score=final_score,
        label=result["label"],
        confidence=result["confidence"],
        url_analysis=url_analysis if url_analysis["urls_found"] > 0 else None,
    )


@app.post("/analyze-url")
async def check_url(request: URLCheckRequest):
    if not request.url.strip():
        raise HTTPException(status_code=400, detail="URL cannot be empty")
    return analyze_url(request.url)


@app.post("/analyze-image")
async def check_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 50MB)")

    result = analyze_image(contents)
    return result


@app.get("/trusted-sources")
async def trusted_sources():
    return get_all_sources()


@app.post("/train")
async def train(request: TrainRequest):
    if len(request.texts) != len(request.labels):
        raise HTTPException(status_code=400, detail="Texts and labels must have equal length")

    if len(request.texts) < 10:
        raise HTTPException(status_code=400, detail="Need at least 10 samples for training")

    try:
        metrics = classifier.train(request.texts, request.labels)
        return {"message": "Model trained successfully", "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-analyze")
async def batch_analyze(texts: list[str]):
    results = []
    for text in texts:
        if len(text.strip()) >= 10:
            result = classifier.predict(text)
            url_info = analyze_urls_in_text(text)
            result["url_analysis"] = url_info if url_info["urls_found"] > 0 else None
            results.append(result)
        else:
            results.append({
                "credibility_score": -1,
                "label": "insufficient_text",
                "confidence": 0.0,
                "url_analysis": None,
            })
    return {"results": results}
