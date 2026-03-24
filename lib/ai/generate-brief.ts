import type { CompanyInsight, NewsItem, SentimentLabel, StockQuote } from "@/lib/types";

function computeHeadlineScore(news: NewsItem[]) {
  if (!news.length) {
    return 50;
  }

  const total = news.reduce((score, item) => {
    if (item.sentiment === "bullish") {
      return score + 12;
    }

    if (item.sentiment === "bearish") {
      return score - 12;
    }

    return score + 1;
  }, 50);

  return Math.max(0, Math.min(100, total));
}

function labelFromScore(score: number): SentimentLabel {
  if (score >= 62) {
    return "bullish";
  }

  if (score <= 42) {
    return "bearish";
  }

  return "neutral";
}

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callGroq(prompt: string) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a financial analyst. Return valid JSON with summary, risks, and opportunities arrays.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  return payload.choices?.[0]?.message?.content ?? null;
}

function fallbackInsight(company: StockQuote, news: NewsItem[]): CompanyInsight {
  const score = computeHeadlineScore(news);
  const signal = labelFromScore(score);
  const strongest = news.slice(0, 3).map((item) => item.title).join("; ");

  return {
    symbol: company.symbol,
    companyName: company.name,
    headlineScore: score,
    signal,
    summary:
      strongest.length > 0
        ? `${company.symbol} is showing a ${signal} signal based on the latest multi-source headlines: ${strongest}`
        : `${company.symbol} has limited live source coverage right now, so the dashboard is using structural relationships and quote context.`,
    risks: [
      "Social connectors may be inactive until optional tokens are configured.",
      "Headline-driven signals can overreact to short-term narratives.",
      "Rate limits from free APIs can slow refresh frequency.",
    ],
    opportunities: [
      "Compare supplier and customer moves to catch second-order reactions.",
      "Use the relationship graph to extend watchlists beyond a single ticker.",
      "Turn on a free LLM key for richer summaries and better signal framing.",
    ],
  };
}

export async function generateInsight(company: StockQuote, news: NewsItem[]) {
  const score = computeHeadlineScore(news);
  const prompt = `
Analyze ${company.symbol} (${company.name}) from these headlines.
Return strict JSON with keys summary, risks, opportunities.
Headlines:
${news.slice(0, 8).map((item) => `- [${item.sentiment}] ${item.title}`).join("\n")}
`;

  const llmResponse = (await callGemini(prompt)) ?? (await callGroq(prompt));
  if (!llmResponse) {
    return fallbackInsight(company, news);
  }

  try {
    const parsed = JSON.parse(llmResponse) as {
      summary?: string;
      risks?: string[];
      opportunities?: string[];
    };

    return {
      symbol: company.symbol,
      companyName: company.name,
      headlineScore: score,
      signal: labelFromScore(score),
      summary: parsed.summary ?? fallbackInsight(company, news).summary,
      risks: parsed.risks?.slice(0, 3) ?? fallbackInsight(company, news).risks,
      opportunities:
        parsed.opportunities?.slice(0, 3) ?? fallbackInsight(company, news).opportunities,
    } satisfies CompanyInsight;
  } catch {
    return fallbackInsight(company, news);
  }
}
