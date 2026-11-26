# 01 · Internet

> **Fase:** 1 · **Estimasi:** 1 minggu · **Prasyarat:** tidak ada

## Kenapa ini penting

Setiap keputusan front-end, seperti caching, ukuran bundle, CDN, preload, dan CORS, adalah
keputusan tentang jaringan. Developer yang tidak paham jalur dari URL sampai pixel akan
mengoptimasi di tempat yang salah.

## Peta konsep

### Dasar
- [ ] Cara kerja internet: paket, IP, router, ISP
- [ ] Apa itu HTTP: method, status code, header, body
- [ ] Domain name, registrar, dan hosting
- [ ] DNS: resolver, root, TLD, authoritative, record `A`/`AAAA`/`CNAME`/`TXT`
- [ ] Cara kerja browser secara garis besar

### Menengah
- [ ] TCP handshake, TLS handshake, dan biayanya dalam round-trip
- [ ] HTTP/1.1 vs HTTP/2 (multiplexing) vs HTTP/3 (QUIC, UDP)
- [ ] Caching HTTP: `Cache-Control`, `ETag`, `Last-Modified`, `Vary`, `stale-while-revalidate`
- [ ] CDN dan edge: kenapa jarak fisik masih penting
- [ ] Kompresi: gzip vs brotli

### Deep dive
- [ ] Head-of-line blocking di TCP dan cara QUIC menyelesaikannya
- [ ] Connection reuse, `preconnect`, `dns-prefetch`, 103 Early Hints
- [ ] Bagaimana browser memutuskan resource prioritas (fetch priority)

## Cara belajar

1. Buka DevTools → **Network**, centang *Disable cache*, buka satu situs. Baca kolom *Timing*
   untuk satu request: DNS, Initial connection, SSL, TTFB, Content download. Catat angkanya.
2. Jalankan `dig +trace example.com` dan ikuti rantai DNS dari root sampai authoritative.
3. Jalankan `curl -v https://example.com` dan baca TLS handshake serta header respons.
4. Bandingkan satu situs di HTTP/1.1 dan HTTP/2 (kolom *Protocol* di Network panel), dan lihat
   bentuk waterfall-nya.
5. Eksperimen cache: buat server kecil yang mengirim `Cache-Control: max-age=60` lalu `no-cache`
   + `ETag`, dan amati status `200` vs `304` vs *from disk cache*.

## Uji pemahaman

1. Apa yang terjadi, langkah demi langkah, antara menekan Enter di address bar dan pixel pertama
   tampil? Sebutkan minimal 10 langkah.
2. Kenapa domain sharding membantu di HTTP/1.1 tapi merugikan di HTTP/2?
3. Apa beda `no-cache` dan `no-store`? Kapan memakai masing-masing?
4. Berapa round-trip minimum sebelum byte pertama HTML diterima pada koneksi HTTPS baru di
   HTTP/2? Bagaimana dengan HTTP/3?
5. Kenapa respons dengan `Vary: Cookie` sering tidak ter-cache di CDN?

## Proyek latihan

| Tingkat | Proyek | Yang dilatih |
| --- | --- | --- |
| Dasar | Deploy halaman statis ke hosting + domain sendiri, set DNS manual | DNS, hosting |
| Menengah | Server Node kecil dengan strategi cache berbeda per jenis file (HTML, hashed assets, API) | Caching HTTP |
| Deep | Tulis HTTP/1.1 client minimal di atas socket TCP (`net` di Node), lalu parse respons sendiri | Format HTTP dari dekat |

## Sumber primer

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) dan [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111)
- [High Performance Browser Networking](https://hpbn.co/) (Ilya Grigorik, gratis online)
- [MDN: HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)
- [web.dev: How browsers work](https://web.dev/articles/howbrowserswork)

## Toolkit terkait

- [`@chalidade/http-cache-presets`](/toolkit/http-cache-presets): builder dan preset `Cache-Control` untuk aset ber-hash, HTML, API, dan data sensitif
- Deep dive: [HTTP Caching](../deep-dives/http-caching.md)
