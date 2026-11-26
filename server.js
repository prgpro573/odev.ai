import express from "express";
import fs from "fs/promises";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Yanlış görünen çözümler raporlar.json içine yazılır; `node uret.js --raporlu` yeniden çözer.
app.post("/api/report", async (req, res) => {
  const { bookId, page } = req.body || {};
  if (typeof bookId !== "string" || !Number.isInteger(page)) return res.status(400).json({ error: "Geçersiz." });
  let list = [];
  try { list = JSON.parse(await fs.readFile("raporlar.json", "utf8")); } catch {}
  if (!list.some((r) => r.bookId === bookId && r.page === page)) list.push({ bookId, page });
  await fs.writeFile("raporlar.json", JSON.stringify(list, null, 1));
  res.json({ ok: true });
});

app.listen(process.env.PORT || 3000, () => console.log("http://localhost:3000"));
