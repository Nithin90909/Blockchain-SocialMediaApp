"""
URL credibility checker - extracts and analyzes URLs from post content.
Checks against known unreliable domains, suspicious patterns, and trusted sources.
"""

import re
import logging
from urllib.parse import urlparse
from model.trusted_sources import get_trusted_sources, get_untrusted_sources

logger = logging.getLogger(__name__)

SUSPICIOUS_PATTERNS = [
    r"bit\.ly", r"tinyurl\.com", r"t\.co",
    r"goo\.gl", r"ow\.ly", r"is\.gd",
    r"buff\.ly", r"adf\.ly", r"bc\.vc",
]

SUSPICIOUS_TLD = [
    ".xyz", ".top", ".club", ".work", ".date",
    ".racing", ".win", ".bid", ".stream",
    ".download", ".click", ".link", ".gdn",
]

CLICKBAIT_URL_KEYWORDS = [
    "shocking", "exposed", "secret", "urgent", "breaking",
    "miracle", "cure", "won-t-believe", "doctors-hate",
    "government-hiding", "conspiracy", "leaked", "banned",
]


def extract_urls(text: str) -> list[str]:
    url_pattern = re.compile(
        r'https?://[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+'
    )
    return url_pattern.findall(text)


def analyze_url(url: str) -> dict:
    """Analyze a single URL for credibility signals."""
    try:
        parsed = urlparse(url if url.startswith("http") else f"https://{url}")
        domain = parsed.netloc.lower()
        path_lower = parsed.path.lower() + parsed.query.lower()
    except Exception:
        return {"url": url, "score": 20, "flags": ["invalid_url"]}

    score = 70
    flags = []

    trusted = get_trusted_sources()
    untrusted = get_untrusted_sources()

    for src in trusted:
        if src["domain"] in domain:
            score = min(100, score + src.get("boost", 20))
            flags.append(f"trusted_source:{src['name']}")
            break

    for src in untrusted:
        if src["domain"] in domain:
            score = max(0, score - src.get("penalty", 40))
            flags.append(f"untrusted_source:{src['name']}")
            break

    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, domain):
            score -= 15
            flags.append("url_shortener")
            break

    for tld in SUSPICIOUS_TLD:
        if domain.endswith(tld):
            score -= 20
            flags.append(f"suspicious_tld:{tld}")
            break

    for kw in CLICKBAIT_URL_KEYWORDS:
        if kw in path_lower or kw in domain:
            score -= 10
            flags.append(f"clickbait_keyword:{kw}")

    if len(domain.split(".")) > 4:
        score -= 10
        flags.append("excessive_subdomains")

    score = max(0, min(100, score))

    return {
        "url": url,
        "domain": domain,
        "score": score,
        "flags": flags,
    }


def analyze_urls_in_text(text: str) -> dict:
    urls = extract_urls(text)
    if not urls:
        return {"urls_found": 0, "url_results": [], "avg_score": -1}

    results = [analyze_url(u) for u in urls]
    avg_score = sum(r["score"] for r in results) / len(results)

    return {
        "urls_found": len(urls),
        "url_results": results,
        "avg_score": round(avg_score, 1),
    }
