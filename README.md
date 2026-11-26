# odev.ai

Site tamamen statiktir: `public/` klasörü her yerde yayınlanabilir (Netlify, GitHub Pages, kendi sunucun).
Çözümler `public/sorular/<sınıf>-<ders>/sayfa<N>.json` dosyalarıdır; site bunları doğrudan okur.
Sayfa kitabın sayfa sayısını aşarsa "Kitapta bu kadar sayfa yok", dosya yoksa "Bu sayfada soru yok" yazar.

## Yerelde açmak
`npm install` sonra `npm start` -> http://localhost:3000
(index.html dosyasına çift tıklayıp açma: çalışmaz, sunucudan aç.)

## Çözüm üretmek (isteğe bağlı, API anahtarı gerekir)
`books/10-fizik.pdf` koy, `public/books.json` içinde `offset` ayarla, sonra
`node uret.js 10-fizik` / `node uret.js 10-fizik 40 60` / `--zorla` / `--raporlu`
