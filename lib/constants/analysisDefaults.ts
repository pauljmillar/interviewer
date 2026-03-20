export const DEFAULT_SCORING_PROMPT = `Score each interview answer 0–10:
  0–2  No answer, off-topic, or refused to engage
  3–4  Partial answer, missing significant elements
  5–6  Adequate; covers the basics
  7–8  Strong; demonstrates real understanding and relevant experience
  9–10 Exceptional; specific examples, depth, exceeds expectations

Also provide an "Overall Impression" score (0–10) for the whole conversation:
  Consider: enthusiasm and passion, communication quality and clarity, signs of
  reliability (sustained engagement, completing all questions), professional attitude,
  curiosity, confidence, and any warm/stand-out personality traits visible in the text.
  This is weighted equally to one question in the final score.

Be consistent — a "7" should mean the same quality regardless of when you score.`;
