"""
Trusted and untrusted source databases for publisher credibility checking.
Domains are matched as substrings of the URL's host, so 'reuters.com'
will match 'www.reuters.com', 'in.reuters.com', etc.
"""


def get_trusted_sources() -> list[dict]:
    return [
        {"name": "Reuters", "domain": "reuters.com", "category": "news", "boost": 25},
        {"name": "Associated Press", "domain": "apnews.com", "category": "news", "boost": 25},
        {"name": "BBC", "domain": "bbc.com", "category": "news", "boost": 20},
        {"name": "BBC UK", "domain": "bbc.co.uk", "category": "news", "boost": 20},
        {"name": "NPR", "domain": "npr.org", "category": "news", "boost": 20},
        {"name": "PBS", "domain": "pbs.org", "category": "news", "boost": 20},
        {"name": "The Guardian", "domain": "theguardian.com", "category": "news", "boost": 18},
        {"name": "The New York Times", "domain": "nytimes.com", "category": "news", "boost": 18},
        {"name": "Washington Post", "domain": "washingtonpost.com", "category": "news", "boost": 18},
        {"name": "The Economist", "domain": "economist.com", "category": "news", "boost": 18},
        {"name": "Nature", "domain": "nature.com", "category": "science", "boost": 30},
        {"name": "Science Magazine", "domain": "science.org", "category": "science", "boost": 30},
        {"name": "PubMed", "domain": "pubmed.ncbi.nlm.nih.gov", "category": "science", "boost": 30},
        {"name": "NIH", "domain": "nih.gov", "category": "health", "boost": 28},
        {"name": "CDC", "domain": "cdc.gov", "category": "health", "boost": 28},
        {"name": "WHO", "domain": "who.int", "category": "health", "boost": 28},
        {"name": "NASA", "domain": "nasa.gov", "category": "science", "boost": 28},
        {"name": "MIT", "domain": "mit.edu", "category": "education", "boost": 25},
        {"name": "Stanford", "domain": "stanford.edu", "category": "education", "boost": 25},
        {"name": "Harvard", "domain": "harvard.edu", "category": "education", "boost": 25},
        {"name": "Oxford", "domain": "ox.ac.uk", "category": "education", "boost": 25},
        {"name": "Snopes", "domain": "snopes.com", "category": "fact-check", "boost": 22},
        {"name": "PolitiFact", "domain": "politifact.com", "category": "fact-check", "boost": 22},
        {"name": "FactCheck.org", "domain": "factcheck.org", "category": "fact-check", "boost": 22},
        {"name": "Full Fact", "domain": "fullfact.org", "category": "fact-check", "boost": 22},
        {"name": "Bureau of Labor Statistics", "domain": "bls.gov", "category": "government", "boost": 25},
        {"name": "US Census", "domain": "census.gov", "category": "government", "boost": 25},
        {"name": "SEC", "domain": "sec.gov", "category": "government", "boost": 25},
        {"name": "arXiv", "domain": "arxiv.org", "category": "science", "boost": 22},
        {"name": "IEEE", "domain": "ieee.org", "category": "science", "boost": 22},
    ]


def get_untrusted_sources() -> list[dict]:
    return [
        {"name": "InfoWars", "domain": "infowars.com", "category": "conspiracy", "penalty": 50},
        {"name": "NaturalNews", "domain": "naturalnews.com", "category": "pseudoscience", "penalty": 45},
        {"name": "Before It's News", "domain": "beforeitsnews.com", "category": "conspiracy", "penalty": 45},
        {"name": "YourNewsWire", "domain": "yournewswire.com", "category": "fake_news", "penalty": 50},
        {"name": "WorldTruthTV", "domain": "worldtruth.tv", "category": "conspiracy", "penalty": 45},
        {"name": "The Gateway Pundit", "domain": "thegatewaypundit.com", "category": "misinformation", "penalty": 40},
        {"name": "Zero Hedge", "domain": "zerohedge.com", "category": "misinformation", "penalty": 30},
        {"name": "Daily Stormer", "domain": "dailystormer.su", "category": "hate", "penalty": 50},
        {"name": "GlobalResearch", "domain": "globalresearch.ca", "category": "conspiracy", "penalty": 40},
        {"name": "Collective Evolution", "domain": "collective-evolution.com", "category": "pseudoscience", "penalty": 35},
        {"name": "Disclose.tv", "domain": "disclose.tv", "category": "conspiracy", "penalty": 35},
        {"name": "NewsMax (opinion)", "domain": "newsmax.com", "category": "bias", "penalty": 20},
        {"name": "RT News", "domain": "rt.com", "category": "state_media", "penalty": 30},
    ]


def get_all_sources() -> dict:
    """Return both trusted and untrusted sources for API exposure."""
    return {
        "trusted": get_trusted_sources(),
        "untrusted": get_untrusted_sources(),
        "total_trusted": len(get_trusted_sources()),
        "total_untrusted": len(get_untrusted_sources()),
    }
