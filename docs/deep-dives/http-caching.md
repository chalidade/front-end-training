# Deep Dive: HTTP Caching

> Terkait: [01 Internet](../roadmap/01-internet.md), [09 Build Tools](../roadmap/09-build-tools.md),
> [16 Performance](../roadmap/16-performance.md), [17 Browser APIs & PWA](../roadmap/17-browser-apis.md)

## Pertanyaan pembuka

Kenapa user masih melihat versi lama setelah deploy? Kenapa `no-cache` tetap menyimpan cache?
Kenapa file JS dengan hash di namanya boleh di-cache setahun, tapi `index.html` tidak boleh?
Request yang tercatat di Network panel sebagai "(disk cache)" dan "304" itu sebenarnya berbeda
apa?

## Model mental

Setiap respons yang tersimpan di cache punya dua pertanyaan:

1. **Masih segar (fresh)?** Kalau ya, browser memakainya **tanpa ke jaringan sama sekali**.
2. **Kalau sudah basi (stale), apakah masih sama?** Browser bertanya ke server dengan
   *conditional request*. Kalau tidak berubah, server menjawab `304 Not Modified` tanpa body,
   dan cache dipakai lagi.

```
request → ada di cache?
  ├─ tidak → ambil dari jaringan → simpan kalau boleh
  └─ ya → fresh? (age < freshness lifetime)
        ├─ ya  → pakai cache            (0 round trip)
        └─ tidak → revalidasi (If-None-Match / If-Modified-Since)
              ├─ 304 → pakai cache, perbarui metadata   (1 round trip, tanpa body)
              └─ 200 → pakai respons baru, ganti cache
```

**Freshness** menghemat round trip. **Validation** menghemat bandwidth. Strategi caching yang baik
memilih mana yang dipakai untuk setiap jenis resource.

## Mekanisme detail

### Freshness

- `Cache-Control: max-age=N`: segar selama N detik sejak respons dibuat. `Age` dari proxy/CDN ikut
  dihitung.
- `s-maxage=N`: sama, tapi hanya untuk shared cache (CDN, proxy), dan mengalahkan `max-age` di sana.
- `Expires: <tanggal>`: cara lama. Diabaikan kalau ada `max-age`.
- **Heuristic freshness**: kalau tidak ada `max-age` maupun `Expires` tapi ada `Last-Modified`,
  cache boleh menebak. Biasanya 10% dari umur file. File yang terakhir diubah 30 hari lalu bisa
  dianggap segar sekitar 3 hari tanpa pernah bertanya ke server. Inilah penyebab klasik "kok
  masih versi lama?".

### Validation

| Validator dari server | Ditanyakan balik oleh browser |
| --- | --- |
| `ETag: "abc123"` | `If-None-Match: "abc123"` |
| `Last-Modified: <tanggal>` | `If-Modified-Since: <tanggal>` |

ETag lebih akurat (tidak tergantung jam dan resolusi 1 detik). Kalau ada keduanya, `If-None-Match`
yang dipakai server.

### Directive yang sering salah dipahami

| Directive | Artinya sebenarnya |
| --- | --- |
| `no-cache` | Boleh disimpan, tapi **wajib revalidasi** setiap kali sebelum dipakai |
| `no-store` | Jangan simpan sama sekali (data sensitif) |
| `private` | Hanya cache browser, bukan CDN/proxy (respons per user) |
| `public` | Boleh disimpan shared cache, bahkan untuk respons yang biasanya tidak (mis. dengan `Authorization`) |
| `must-revalidate` | Setelah basi, jangan pernah dipakai tanpa revalidasi, walaupun server tidak bisa dihubungi |
| `immutable` | Selama masih segar, jangan revalidasi bahkan saat user menekan reload |
| `stale-while-revalidate=N` | Setelah basi, boleh dipakai selama N detik sambil revalidasi di background |
| `stale-if-error=N` | Boleh pakai versi basi kalau server error |

### `Vary`

`Vary: Accept-Encoding` berarti respons di-cache **per nilai header tersebut**: versi gzip dan
brotli disimpan terpisah. `Vary: Cookie` atau `Vary: User-Agent` di CDN hampir sama dengan
mematikan cache, karena hampir setiap user punya nilai yang berbeda.

### Lapisan cache

Urutan pencarian kira-kira: **memory cache** (di dalam tab, untuk resource yang baru dipakai) →
**Service Worker** (kalau ada, dan ia bebas menentukan apa saja) → **HTTP cache** (disk) → **CDN /
proxy** → origin. **bfcache** (back/forward cache) terpisah: ia menyimpan seluruh halaman yang
sedang hidup saat user menekan tombol back, bukan respons HTTP.

### Perilaku reload

- Navigasi biasa: aturan freshness berlaku normal.
- Reload: dokumen utama selalu direvalidasi. Chrome hanya merevalidasi dokumen utama, sedangkan
  Firefox juga merevalidasi subresource kecuali yang bertanda `immutable`.
- Hard reload (Ctrl/Cmd+Shift+R): melewati cache.

## Eksperimen

1. **Lihat header aslinya.**
   ```bash
   curl -sI https://chalidade.github.io/front-end-training/ | grep -iE "cache-control|etag|last-modified|age|expires"
   ```
   Lalu ambil salah satu file di `/front-end-training/assets/` dan bandingkan. Kenapa nilainya sama padahal satu
   punya hash di namanya? (GitHub Pages tidak bisa diatur per file.)
2. **304 dengan tangan.** Ambil ETag dari langkah 1, lalu:
   ```bash
   curl -sI -H 'If-None-Match: "<etag>"' https://chalidade.github.io/front-end-training/
   ```
3. **Server sendiri.** Buat server Node kecil yang mengembalikan `Cache-Control` berbeda per path
   (`max-age=10`, `no-cache`, `no-store`, `max-age=31536000, immutable`). Buka di DevTools dengan
   *Disable cache* dimatikan, lalu catat di kolom Size: `(memory cache)`, `(disk cache)`, `304`,
   atau ukuran penuh. Lakukan navigasi biasa, reload, dan hard reload.
4. **Heuristic freshness.** Hapus `Cache-Control`, kirim `Last-Modified` 30 hari lalu, ubah isi
   file, lalu reload biasa. Apakah browser bertanya ke server?

## Implikasi praktis

Pola yang dipakai hampir semua aplikasi modern:

| Resource | Header | Kenapa |
| --- | --- | --- |
| Asset dengan hash (`app.3f9a1c.js`, font, gambar dari bundler) | `public, max-age=31536000, immutable` | Isi berubah = nama berubah, jadi aman di-cache selamanya |
| HTML / entry point | `no-cache` (plus ETag) | Selalu revalidasi supaya deploy baru langsung terlihat, tapi tetap murah lewat 304 |
| API data publik | `max-age` pendek + `stale-while-revalidate` | Cepat dan tetap cukup baru |
| Respons per user | `private, no-cache` | Jangan sampai tersimpan di CDN dan bocor ke user lain |
| Data sensitif (token, data bank) | `no-store` | Jangan tersimpan di disk sama sekali |

Tabel ini tersedia sebagai kode di [`@chalidade/http-cache-presets`](/toolkit/http-cache-presets),
lengkap dengan eksperimen Chromium yang menunjukkan file mana yang benar-benar diminta ulang.

- **Jangan pernah** memberi `max-age` panjang ke URL yang isinya bisa berubah. Tidak ada cara
  untuk "menarik kembali" cache yang sudah ada di browser user.
- Kalau user melihat versi lama setelah deploy, cek dulu header HTML: hampir selalu ada
  `max-age` atau heuristic freshness di sana.
- Service Worker menambah lapisan cache yang kamu kendalikan sendiri, dan juga menambah cara
  baru untuk menyajikan versi lama. Pastikan ada strategi update yang jelas.

## Sumber primer

- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111)
- [RFC 9110: HTTP Semantics, Conditional Requests](https://www.rfc-editor.org/rfc/rfc9110#name-conditional-requests)
- [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- Jake Archibald, [*Caching best practices & max-age gotchas*](https://jakearchibald.com/2016/caching-best-practices/)
- [web.dev: Prevent unnecessary network requests with the HTTP Cache](https://web.dev/articles/http-cache)
