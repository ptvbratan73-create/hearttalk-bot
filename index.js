// HeartTalk – Telegram-Bot mit OpenAI (ESM)
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!TELEGRAM_TOKEN || !OPENAI_API_KEY) {
  console.error("Missing env vars TELEGRAM_TOKEN or OPENAI_API_KEY");
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// kleine Hilfsfunktion, um Antworten kurz zu halten
const systemPrompt = `
Du bist HeartTalk – ein lockerer, ehrlicher und souveräner Kommunikations-Buddy. 
Du sprichst wie ein guter Freund: klar, natürlich, ohne Fachsprache, ohne künstliche Förmlichkeit und ohne Anglizismen. Keine KI-Begriffe, keine Floskeln.

Ziel: Du hilfst dabei einzuschätzen, wie Nachrichten gemeint sein könnten, und gibst passende Antwortvorschläge. 
Du bist positiv, ruhig, menschlich und bodenständig. 
Du bleibst immer freundlich, nie drängend, nie übertrieben „psychologisch“. 
Deine Sprache ist direkt und alltagstauglich.

Struktur für jede Antwort:
1. "So kommt das rüber:" – kurze ehrliche Einschätzung in 1–2 Sätzen.
2. "Mögliche Deutungen:" – drei alltagstaugliche Lesarten der Nachricht.
3. "So könntest du antworten:" – vier Antwortvorschläge:

   - locker: entspannt, leicht, unkompliziert.
   - charmant: warm, leicht spielerisch, aber nicht aufdringlich.
   - souverän: ruhig, klar, gelassen, erwachsen.
   - klar: selbstbewusst, respektvoll, kein Druck, Tür offen, aber nicht bettelnd.

Wichtig:
- kurze, klare Sätze.
- Kein Englisch.
- Keine modernen Trendbegriffe.
- Schreib so, wie ein guter Freund schreiben würde, der sich auskennt und die Lage realistisch einschätzt.
`;

bot.onText(/\/start/, async (msg) => {
  const text =
    "👋 Willkommen bei **HeartTalk**!\n\n" +
    "Schick mir einfach eine Chat-Nachricht oder nutze /analyse und füge den Text an.\n" +
    "Ich erkenne Ton & Subtext und gebe dir 3 Antwortstile: *locker*, *charmant*, *souverän*.\n\n" +
    "Beispiel: `Sie: Weiß nicht, ob ich heute kann.`";
  await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

bot.onText(/\/help/, async (msg) => {
  const text =
    "ℹ️ **HeartTalk Hilfe**\n" +
    "- Sende mir eine Nachricht aus deinem Chat\n" +
    "- oder nutze: `/analyse Dein Text hier`\n" +
    "- Daten: Es wird nichts dauerhaft gespeichert.\n";
  await bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// /analyse Befehl: /analyse <text>
bot.onText(/^\/analyse(?:@[\w_]+)?\s+([\s\S]+)/i, async (msg, match) => {
  const userText = (match?.[1] || "").trim();
  if (!userText) return bot.sendMessage(msg.chat.id, "Bitte Text anfügen: `/analyse Dein Text`", { parse_mode: "Markdown" });
  await handleAnalysis(msg.chat.id, userText);
});

// alle sonstigen Textnachrichten (keine Commands)
bot.on("message", async (msg) => {
  const text = msg.text || "";
  if (!text || text.startsWith("/")) return; // andere Commands ignorieren
  await handleAnalysis(msg.chat.id, text);
});

async function handleAnalysis(chatId, userText) {
  try {
    // Sicherheitsnetz: sehr lange Texte kürzen → spart Kosten
    const clipped = userText.length > 2000 ? userText.slice(0, 2000) + " …" : userText;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: clipped }
      ],
      max_tokens: 700, // Kostenbremse
      temperature: 0.7
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty completion");

    // kleine Formatierung + Copy-Buttons
    await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    await bot.sendMessage(
      chatId,
      "⚠️ Da ist etwas schiefgelaufen. Versuch es gleich nochmal oder kürze den Text ein wenig."
    );
  }
}

console.log("HeartTalk bot is running…");
