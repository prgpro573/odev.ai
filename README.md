# odev.ai

1. `npm install`
2. MEB ders kitabı PDF'lerini `books/` klasörüne koy (adlar `books.json` ile eşleşmeli).
   `offset`: PDF sayfa sırası ile kitaptaki basılı sayfa numarası arasındaki fark
   (kapak/içindekiler 4 sayfaysa ve basılı sayfa 1 PDF'te 5. sayfaysa offset = 4).
3. `export ANTHROPIC_API_KEY=...` ve `npm start`
4. http://localhost:3000

Çözümler `cache/` klasörüne yazılır; aynı sayfa tekrar sorulunca API çağrısı yapılmaz.
"Çözüm yanlış görünüyor" ile işaretlenen kayıt bir sonraki istekte yeniden üretilir.
Yeni kitap eklemek için sadece `books.json`'a satır ekle.

Tasarımlar: `/` (sıcak, açık tema) ve `/v1.html` (kareli defter teması).
