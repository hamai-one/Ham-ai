
export interface GroqSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  tp: number;
  sl: number;
}

export interface GroqChatResponse {
  text: string;
  thought?: string;
}

export class GroqService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chatAnalysis(prompt: string): Promise<GroqChatResponse> {
    if (!this.apiKey) return { text: "Neural Key missing." };

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "deepseek-r1-distill-llama-70b",
          messages: [
            {
              role: "system",
              content: `AETERNA-DEEPSEEK-CORE (V12.0). 
              Primary Directives:
              - Focus on SMC (Smart Money Concepts), ICT, and Wyckoff logic.
              - Identify Liquidity Sweeps, Fair Value Gaps (FVG), and Market Structure Breaks (BOS/CHoCH).
              - Be an elite institutional analyst. Output in Indonesian where applicable but keep technical terms.`
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.6,
          stream: false
        })
      });

      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (!response.ok) throw new Error("Uplink failure");

      const data = await response.json();
      const rawContent = data.choices[0].message.content;
      
      let thought = "";
      let text = rawContent;

      if (rawContent.includes("<thought>")) {
        const parts = rawContent.split("</thought>");
        thought = parts[0].replace("<thought>", "").trim();
        text = parts[1].trim();
      } else if (rawContent.includes("### Reasoning")) {
        const parts = rawContent.split("### Response");
        thought = parts[0].replace("### Reasoning", "").trim();
        text = parts[1] ? parts[1].trim() : parts[0].trim();
      }

      return { text, thought };
    } catch (error: any) {
      if (error.message === "RATE_LIMIT") throw error;
      return { text: "Neural connection lost. Re-establishing link..." };
    }
  }

  async getDeepSeekSignal(asset: string, price: number, strategy: string): Promise<GroqSignal | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "deepseek-r1-distill-llama-70b",
          messages: [
            {
              role: "system",
              content: `You are the AETERNA-CORE PRO. 
              Output strictly JSON for trading signal analysis. 
              {"action": "BUY"|"SELL"|"HOLD", "confidence": 0-100, "reasoning": "...", "tp_percent": number, "sl_percent": number}`
            },
            {
              role: "user",
              content: `Analysis Required: ${asset}/USDT. Price: ${price}. Bias: ${strategy}.`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        })
      });

      if (response.status === 429) throw new Error("RATE_LIMIT");

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      return {
        action: content.action,
        confidence: content.confidence,
        reasoning: content.reasoning,
        tp: content.tp_percent,
        sl: content.sl_percent
      };
    } catch (error: any) {
      console.error("Groq Analysis Error:", error);
      return null;
    }
  }
}
