# odev.ai

## Klasör düzeni
```
books/10-fizik.pdf               MEB kitap PDF'leri (sadece çözüm üretirken lazım)
sorular/10-fizik/sayfa45.json    45. sayfadaki sorular + cevap + açıklama
sorular/10-matematik/...
```
Klasör adı `sınıf-ders` (9-matematik ve 10-matematik karışmasın diye). Soru olmayan sayfa için dosya yazılmaz.
Sitede dosya yoksa "Bu sayfada soru yok", sayfa kitabın sayfa sayısından büyükse "Kitapta bu kadar sayfa yok" yazar.

## Çözümleri üretmek (bir kez, bilgisayarında)
1. `npm install`, `export ANTHROPIC_API_KEY=...`
2. PDF'i `books/` içine koy, `books.json` içindeki `offset` değerini ayarla
   (PDF'te basılı sayfa 1 beşinci sayfaysa offset = 4).
3. `node uret.js 10-fizik` (hepsi) · `node uret.js 10-fizik 40 60` (aralık) · `--zorla` (üstüne yaz)
   Kitabın sayfa sayısı `books.json`'a otomatik yazılır. Boş sayfalar `_taranan.json`'a not edilir.
4. "Çözüm yanlış görünüyor" ile işaretlenenler `sorular/raporlar.json`'a düşer: `node uret.js --raporlu`

## Siteyi açmak
`npm start` → http://localhost:3000 (site API anahtarı istemez, sadece hazır dosyaları okur.)
