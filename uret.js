// Kullanım:
//   node uret.js 10-fizik            -> kitabın tüm sayfalarını çözer
//   node uret.js 10-fizik 40 60      -> sadece 40-60. sayfalar
//   node uret.js 10-fizik --zorla    -> var olan dosyaların üstüne yazar
//   node uret.js --raporlu           -> "yanlış" diye işaretlenen sayfaları yeniden çözer
// Soru olan sayfa için sorular/<kitap>/sayfa<N>.json yazar. Soru yoksa dosya yazmaz,
// sadece sorular/<kitap>/_taranan.json içine boş sayfa olarak not düşer (tekrar API'ye sorulmasın diye).
import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";

const client = new Anthropic();
const MODEL = process.env.MODEL || "claude-sonnet-5-5";
const books = JSON.parse(await fs.readFile("books.json", "utf8"));
const args = process.argv.slice(2);
const zorla = args.includes("--zorla");

const SYSTEM = `Sen 10. sınıf öğrencisine ödev çözümü anlatan sabırlı bir öğretmensin.
Sana bir ders kitabı sayfası verilecek. Sayfadaki TÜM soruları (alt şıklar dahil) çöz. Cevapları Türkçe yaz.
Yalnızca geçerli JSON döndür; başka metin ve markdown çiti olmasın. Biçim:
{"sorular":[{"no":"soru numarası","soru":"sorunun çok kısa özeti","cevap":"sadece nihai cevap, kısa","aciklama":"hangi bilgi/formül neden kullanıldı ve adım adım çözüm"}]}
Matematiği düz metinle yaz (LaTeX kullanma): x^2, 3/4, kök(5) gibi.
Emin olmadığın soruda cevap alanına "Emin değilim" yaz ve aciklama alanında nedenini belirt; tahminle cevap uydurma.
Sayfada çözülecek soru yoksa sorular boş dizi olsun.`;

const exists = (f) => fs.access(f).then(() => true, () => false);

async function solvePage(book, src, p) {
  const idx = p + (book.offset || 0) - 1;
  const out = await PDFDocument.create();
  const [pg] = await out.copyPages(src, [idx]);
  out.addPage(pg);
  const data = Buffer.from(await out.save()).toString("base64");
  for (let deneme = 0; deneme < 2; deneme++) {
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 8000, system: SYSTEM,
      messages: [{ role: "user", content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
        { type: "text", text: "Bu sayfadaki tüm soruları çöz." } ] }],
    });
    const raw = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    try {
      const s = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)).sorular;
      if (Array.isArray(s)) return s;
    } catch {}
  }
  throw new Error("JSON okunamadı");
}

async function run(book, pages, force) {
  const src = await PDFDocument.load(await fs.readFile(book.file));
  const toplam = src.getPageCount() - (book.offset || 0);
  if (book.sayfaSayisi !== toplam) {
    book.sayfaSayisi = toplam;
    await fs.writeFile("books.json", JSON.stringify(books, null, 1));
  }
  const dir = `sorular/${book.id}`;
  await fs.mkdir(dir, { recursive: true });
  const tf = `${dir}/_taranan.json`;
  let tarandi = { bos: [] };
  try { tarandi = JSON.parse(await fs.readFile(tf, "utf8")); } catch {}
  const list = pages || Array.from({ length: toplam }, (_, i) => i + 1);
  for (const p of list) {
    if (p < 1 || p > toplam) continue;
    const f = `${dir}/sayfa${p}.json`;
    if (!force && ((await exists(f)) || tarandi.bos.includes(p))) continue;
    try {
      const sorular = await solvePage(book, src, p);
      tarandi.bos = tarandi.bos.filter((x) => x !== p);
      if (sorular.length) {
        await fs.writeFile(f, JSON.stringify({ sayfa: p, sorular, olusturma: Date.now() }, null, 1));
        console.log(`${book.id} sayfa ${p}: ${sorular.length} soru`);
      } else {
        await fs.rm(f, { force: true });
        tarandi.bos.push(p);
        console.log(`${book.id} sayfa ${p}: soru yok`);
      }
      await fs.writeFile(tf, JSON.stringify(tarandi));
    } catch (e) {
      console.error(`${book.id} sayfa ${p}: HATA ${e.message}`);
    }
  }
}

if (args.includes("--raporlu")) {
  let list = [];
  try { list = JSON.parse(await fs.readFile("sorular/raporlar.json", "utf8")); } catch {}
  for (const r of list) {
    const book = books.find((b) => b.id === r.bookId);
    if (book) await run(book, [r.page], true);
  }
  await fs.writeFile("sorular/raporlar.json", "[]");
} else {
  const book = books.find((b) => b.id === args[0]);
  if (!book) { console.error("Kitap bulunamadı. Örn: node uret.js 10-fizik"); process.exit(1); }
  const nums = args.slice(1).filter((a) => /^\d+$/.test(a)).map(Number);
  const pages = nums.length ? Array.from({ length: (nums[1] ?? nums[0]) - nums[0] + 1 }, (_, i) => nums[0] + i) : null;
  await run(book, pages, zorla);
}
