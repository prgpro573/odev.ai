import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const client = new Anthropic(); // ANTHROPIC_API_KEY ortam değişkeninden okunur
const MODEL = process.env.MODEL || "claude-sonnet-5-5";
const books = JSON.parse(await fs.readFile("books.json", "utf8"));
await fs.mkdir("cache", { recursive: true });

const SYSTEM = `Sen 10. sınıf öğrencisine ödev çözümü anlatan sabırlı bir öğretmensin.
Sana bir ders kitabı sayfası verilecek. Sayfadaki TÜM soruları (alt şıklar dahil) çöz. Cevapları Türkçe yaz.
Yalnızca geçerli JSON döndür; başka metin ve markdown çiti olmasın. Biçim:
{"sorular":[{"no":"soru numarası","soru":"sorunun çok kısa özeti","cevap":"sadece nihai cevap, kısa","aciklama":"hangi bilgi/formül neden kullanıldı ve adım adım çözüm"}]}
Matematiği düz metinle yaz (LaTeX kullanma): x^2, 3/4, kök(5) gibi.
Emin olmadığın soruda cevap alanına "Emin değilim" yaz ve aciklama alanında nedenini belirt; tahminle cevap uydurma.
Sayfada çözülecek soru yoksa sorular boş dizi olsun.`;

app.get("/api/books", (_, res) =>
  res.json(books.map(({ id, sinif, ders, ad }) => ({ id, sinif, ders, ad })))
);

app.post("/api/solve", async (req, res) => {
  try {
    const { bookId, page } = req.body;
    const book = books.find((b) => b.id === bookId);
    const p = Number(page);
    if (!book || !Number.isInteger(p) || p < 1)
      return res.status(400).json({ error: "Kitap ya da sayfa numarası geçersiz." });

    const key = crypto.createHash("sha1").update(["v2", bookId, p].join("|")).digest("hex");
    const file = `cache/${key}.json`;
    try {
      const c = JSON.parse(await fs.readFile(file, "utf8"));
      if (!c.flagged) return res.json({ ...c, key, cached: true });
    } catch {}

    const src = await PDFDocument.load(await fs.readFile(book.file));
    const idx = p + (book.offset || 0) - 1;
    if (idx < 0 || idx >= src.getPageCount())
      return res.status(400).json({ error: "Bu sayfa kitapta yok." });
    const out = await PDFDocument.create();
    const [pg] = await out.copyPages(src, [idx]);
    out.addPage(pg);
    const data = Buffer.from(await out.save()).toString("base64");

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
          { type: "text", text: "Bu sayfadaki tüm soruları çöz." },
        ],
      }],
    });
    const raw = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    let items;
    try {
      items = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)).sorular;
      if (!Array.isArray(items)) throw new Error("format");
    } catch {
      return res.status(502).json({ error: "Çözüm okunamadı, tekrar dene." });
    }
    const result = { items, bookId, page: p, flagged: false, createdAt: Date.now() };
    await fs.writeFile(file, JSON.stringify(result));
    res.json({ ...result, key });
  } catch (e) {
    console.error(e);
    if (e.code === "ENOENT")
      return res.status(404).json({ error: "Bu kitabın PDF'i henüz eklenmemiş." });
    res.status(500).json({ error: "Çözüm üretilemedi. Biraz sonra tekrar dene." });
  }
});

// Yanlış çözümü işaretle: önbellekte flagged olur, bir sonraki istekte yeniden üretilir
app.post("/api/report", async (req, res) => {
  try {
    const file = `cache/${String(req.body.key).replace(/[^a-f0-9]/g, "")}.json`;
    const c = JSON.parse(await fs.readFile(file, "utf8"));
    c.flagged = true;
    await fs.writeFile(file, JSON.stringify(c));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Kayıt bulunamadı." });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("http://localhost:3000"));
