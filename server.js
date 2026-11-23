import express from "express";
import fs from "fs/promises";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const books = JSON.parse(await fs.readFile("books.json", "utf8"));

app.get("/api/books", (_, res) =>
  res.json(books.map(({ id, sinif, ders, ad }) => ({ id, sinif, ders, ad })))
);

// Hazır çözümü sorular/<kitap>/sayfa<N>.json dosyasından okur.
// Dosya yoksa o sayfada soru yoktur; sayfa kitabın sayfa sayısını aşıyorsa uyarır.
app.post("/api/solve", async (req, res) => {
  const { bookId, page } = req.body;
  const book = books.find((b) => b.id === bookId);
  const p = Number(page);
  if (!book || !Number.isInteger(p) || p < 1)
    return res.status(400).json({ error: "Kitap ya da sayfa numarası geçersiz." });
  if (book.sayfaSayisi && p > book.sayfaSayisi)
    return res.status(404).json({ error: `Kitapta bu kadar sayfa yok. Bu kitap ${book.sayfaSayisi} sayfa.` });
  try {
    const d = JSON.parse(await fs.readFile(`sorular/${book.id}/sayfa${p}.json`, "utf8"));
    res.json({ items: d.sorular || [] });
  } catch {
    res.json({ items: [] });
  }
});

// Yanlış görünen çözümler sorular/raporlar.json içine yazılır; `npm run uret -- --raporlu` yeniden çözer.
app.post("/api/report", async (req, res) => {
  const { bookId, page } = req.body;
  const book = books.find((b) => b.id === bookId);
  const p = Number(page);
  if (!book || !Number.isInteger(p)) return res.status(400).json({ error: "Geçersiz." });
  let list = [];
  try { list = JSON.parse(await fs.readFile("sorular/raporlar.json", "utf8")); } catch {}
  if (!list.some((r) => r.bookId === bookId && r.page === p)) list.push({ bookId, page: p });
  await fs.writeFile("sorular/raporlar.json", JSON.stringify(list, null, 1));
  res.json({ ok: true });
});

app.listen(process.env.PORT || 3000, () => console.log("http://localhost:3000"));
