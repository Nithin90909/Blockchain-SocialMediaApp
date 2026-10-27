import os
import logging
import numpy as np
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
from model.training_data import get_training_data

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "saved_model.joblib")


class FakeNewsClassifier:
    def __init__(self):
        self.pipeline: Pipeline | None = None

    def is_loaded(self) -> bool:
        return self.pipeline is not None

    def load_or_train(self):
        """Load an existing model from disk, or train from built-in data."""
        if os.path.exists(MODEL_PATH):
            try:
                self.pipeline = joblib.load(MODEL_PATH)
                logger.info("Model loaded from disk")
                return
            except Exception as e:
                logger.warning(f"Failed to load saved model: {e}")

        logger.info("Training new model from built-in dataset")
        texts, labels = get_training_data()
        self.train(texts, labels)

    def train(self, texts: list[str], labels: list[int]) -> dict:
        """
        Train the classifier pipeline.
        Labels: 0 = fake/unreliable, 1 = legitimate/reliable
        """
        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(
                max_features=10000,
                ngram_range=(1, 2),
                stop_words="english",
                sublinear_tf=True,
            )),
            ("clf", LogisticRegression(
                max_iter=1000,
                C=1.0,
                class_weight="balanced",
                random_state=42,
            )),
        ])

        self.pipeline.fit(texts, labels)

        scores = cross_val_score(self.pipeline, texts, labels, cv=min(5, len(texts)), scoring="accuracy")

        joblib.dump(self.pipeline, MODEL_PATH)
        logger.info(f"Model trained and saved. CV accuracy: {scores.mean():.3f}")

        return {
            "accuracy": float(scores.mean()),
            "std": float(scores.std()),
            "samples": len(texts),
        }

    def predict(self, text: str) -> dict:
        """Predict credibility of the given text."""
        if not self.pipeline:
            return {
                "credibility_score": -1,
                "label": "model_not_loaded",
                "confidence": 0.0,
            }

        probabilities = self.pipeline.predict_proba([text])[0]
        prediction = self.pipeline.predict([text])[0]

        legitimate_prob = probabilities[1] if len(probabilities) > 1 else probabilities[0]
        credibility_score = int(legitimate_prob * 100)
        confidence = float(max(probabilities))

        if prediction == 1:
            label = "reliable" if confidence > 0.7 else "likely_reliable"
        else:
            label = "unreliable" if confidence > 0.7 else "questionable"

        return {
            "credibility_score": credibility_score,
            "label": label,
            "confidence": round(confidence, 4),
        }
