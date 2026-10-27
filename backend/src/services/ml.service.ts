import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import { logger } from "../config/logger";

interface CredibilityResult {
  credibilityScore: number;
  label: string;
  confidence: number;
  urlAnalysis?: any;
}

interface ImageAnalysisResult {
  analyzed: boolean;
  score: number;
  label: string;
  flags: string[];
  metadata?: any;
}

export async function analyzeCredibility(text: string): Promise<CredibilityResult> {
  const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";

  try {
    const response = await axios.post(
      `${mlUrl}/analyze`,
      { text },
      { timeout: 10000 }
    );

    return {
      credibilityScore: response.data.credibility_score,
      label: response.data.label,
      confidence: response.data.confidence,
      urlAnalysis: response.data.url_analysis || null,
    };
  } catch (error: any) {
    logger.warn("ML service unavailable, returning default score:", error.message);
    return {
      credibilityScore: -1,
      label: "unknown",
      confidence: 0,
    };
  }
}

export async function analyzeImage(filePath: string): Promise<ImageAnalysisResult> {
  const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";

  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const response = await axios.post(`${mlUrl}/analyze-image`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000,
    });

    return response.data;
  } catch (error: any) {
    logger.warn("Image analysis failed:", error.message);
    return {
      analyzed: false,
      score: -1,
      label: "unknown",
      flags: [],
    };
  }
}

export async function getTrustedSources(): Promise<any> {
  const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";

  try {
    const response = await axios.get(`${mlUrl}/trusted-sources`, { timeout: 5000 });
    return response.data;
  } catch (error: any) {
    logger.warn("Failed to fetch trusted sources:", error.message);
    return { trusted: [], untrusted: [], total_trusted: 0, total_untrusted: 0 };
  }
}
