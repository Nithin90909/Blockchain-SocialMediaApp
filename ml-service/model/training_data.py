"""
Built-in training dataset for the fake news classifier.
This provides a baseline model that works out-of-the-box.
In production, this would be replaced with a larger, curated dataset.
Labels: 0 = fake/unreliable, 1 = legitimate/reliable
"""


def get_training_data() -> tuple[list[str], list[int]]:
    texts = [
        # Reliable / legitimate content (label=1)
        "Scientists have discovered a new species of deep-sea fish in the Pacific Ocean according to a peer-reviewed study published in Nature.",
        "The Federal Reserve announced a quarter-point interest rate increase today, citing ongoing inflation concerns in the economy.",
        "A new clinical trial shows promising results for a cancer treatment targeting specific genetic mutations in patients.",
        "The city council approved a new budget allocation for infrastructure improvements including road repairs and public transit.",
        "Researchers at MIT developed a more efficient solar cell that converts sunlight to electricity at record efficiency.",
        "The World Health Organization released updated guidelines for COVID-19 vaccination schedules based on latest clinical data.",
        "NASA successfully launched a satellite to monitor climate change and atmospheric carbon dioxide levels globally.",
        "A comprehensive study by Oxford University found that regular exercise reduces the risk of cardiovascular disease by 30 percent.",
        "The unemployment rate fell to 3.5 percent last month according to the Bureau of Labor Statistics report released today.",
        "New legislation passed requiring companies to disclose their carbon emissions and sustainability practices annually.",
        "The Supreme Court ruled unanimously on the case, citing precedent from established constitutional law.",
        "International climate conference reached an agreement to reduce carbon emissions by 40 percent over the next decade.",
        "A peer-reviewed medical journal published findings showing a correlation between sleep quality and cognitive performance.",
        "The stock market experienced moderate gains today driven by strong quarterly earnings from technology companies.",
        "University researchers published a longitudinal study tracking health outcomes across 50000 participants over ten years.",
        "The government released official statistics showing GDP growth of 2.1 percent in the third quarter of the fiscal year.",
        "Archaeological excavations in Egypt have uncovered artifacts dating back to the ancient dynasty period confirmed by carbon dating.",
        "Public health officials recommend annual flu vaccines based on comprehensive efficacy data from multiple clinical trials.",
        "The central bank maintained interest rates citing stable employment figures and controlled inflation indicators.",
        "A collaborative international research team published groundbreaking findings on quantum computing in Physical Review Letters.",

        # Fake / unreliable content (label=0)
        "BREAKING: Secret government mind control program exposed! They are putting chemicals in the water to control your thoughts!",
        "Doctors don't want you to know this one weird trick that cures all diseases instantly! Big pharma is hiding the truth!",
        "SHOCKING: Celebrities caught in underground tunnel network! The elite cabal is finally exposed! Share before they delete this!",
        "This miracle supplement will make you lose 50 pounds in one week with no exercise! Scientists are baffled!",
        "EXPOSED: The moon landing was definitely faked! New evidence proves NASA has been lying to us for decades!",
        "5G towers are actually causing a new pandemic! Governments are covering up the truth! Wake up people!",
        "You won't believe what this politician did behind closed doors! The mainstream media refuses to report the real story!",
        "URGENT: Forward this to everyone! A secret vote is happening tonight to take away all your rights forever!",
        "Ancient aliens built the pyramids and the government has been hiding alien technology in secret bases underground!",
        "This leaked document proves that vaccines contain microchips to track your every move! They are watching you!",
        "BREAKING EXCLUSIVE: World leaders secretly planning to replace all currency with a single digital coin to control populations!",
        "Scientists EXPOSED for fabricating climate change data! The whole thing is a massive hoax to steal your money!",
        "Eating this common fruit will instantly cure cancer! Why doctors don't want you to know about natural remedies!",
        "SHARE NOW: A massive asteroid is headed toward Earth and NASA is covering it up to prevent mass panic worldwide!",
        "The election was completely rigged by a shadowy organization using invisible ink and secret ballot switches!",
        "THEY don't want you to see this! Leaked footage shows proof that birds are actually government surveillance drones!",
        "This ancient herbal remedy from a lost civilization cures every disease known to mankind! Pharmaceutical companies hate this!",
        "WARNING: Your smartphone is secretly recording everything you say and sending it directly to foreign spy agencies!",
        "BOMBSHELL: Famous celebrity secretly replaced by a clone! Multiple witnesses confirm they saw the body switch happen!",
        "The flat earth society has undeniable proof that space agencies worldwide have been lying about the shape of the planet!",
    ]

    labels = [1] * 20 + [0] * 20

    return texts, labels
