# Requirements Document

## Introduction

Campaign Manager adalah aplikasi web SaaS untuk mengelola campaign promosi marketplace dengan fokus utama pada **kecepatan dan efisiensi input campaign** oleh Admin. Aplikasi mengadopsi pola antarmuka bergaya papan kerja seperti Trello dan ClickUp: campaign ditampilkan sebagai kartu pada papan Kanban, dikelompokkan ke dalam kolom berdasarkan status, dan dapat dibuat, diubah, serta dipindahkan dengan jumlah interaksi seminimal mungkin.

Aplikasi ini merupakan perubahan arah (pivot) dari aplikasi CampaignHub sebelumnya. Domain bisnis yang sudah mapan tetap dipertahankan: dua peran pengguna (SPV/Supervisor dan Admin), skema campaign dengan opsi promo dan toko target, kategori campaign (Flash Sale, Brand Day, Payday, Mega Bonus, Weekend, Lokal), serta siklus hidup status (Menunggu, Proses, Review, Live, Selesai). Namun titik berat kebutuhan bergeser dari alur persetujuan multi-tahap menjadi pengalaman input data campaign yang cepat: tambah cepat, edit inline, template campaign yang dapat dipakai ulang, aksi massal, pintasan keyboard, palet perintah, dan pratinjau detail tanpa berpindah halaman.

Keluaran tetap berupa aplikasi web SaaS satu halaman (SPA). Antarmuka tampil dalam Bahasa Indonesia dengan gaya light-mode pastel yang minimalis dan profesional. Akses fitur diatur berbasis peran antara SPV dan Admin.

Dokumen ini mendefinisikan kebutuhan fungsional dan kualitas Campaign Manager menggunakan pola EARS dan aturan kualitas INCOSE.

## Glossary

- **Sistem**: Aplikasi web Campaign Manager secara keseluruhan, mencakup komponen frontend dan backend.
- **Layanan_Autentikasi**: Komponen yang memverifikasi identitas pengguna dan membangun sesi terautentikasi.
- **Layanan_Akses**: Komponen yang menegakkan izin berbasis peran untuk peran SPV dan Admin.
- **SPV**: Peran Supervisor yang membuat template campaign, meninjau, dan menyetujui campaign.
- **Admin**: Peran Administrator yang melakukan input dan pengelolaan campaign sehari-hari secara cepat.
- **Campaign**: Inisiatif promosi yang didefinisikan oleh nama, kategori, jadwal, toko target, dan satu atau lebih Opsi_Promo, yang berkembang melalui tahapan Campaign_Status.
- **Campaign_Draft**: Campaign yang baru dibuat melalui Tambah_Cepat dan belum memenuhi seluruh field wajib, ditandai dengan Campaign_Status Menunggu.
- **Skema_Campaign**: Definisi campaign yang dapat dikonfigurasi, mencakup Opsi_Promo, kategori, toko target, dan rentang tanggal.
- **Opsi_Promo**: Satu konfigurasi promosi di dalam Skema_Campaign, misalnya persentase diskon, yang dapat ditambahkan secara dinamis hingga maksimum 20 opsi.
- **Campaign_Status**: Tahap siklus hidup Campaign, salah satu dari Menunggu, Proses, Review, Live, atau Selesai.
- **Campaign_Category**: Klasifikasi Campaign yang digunakan untuk pengkodean warna, salah satu dari Flash Sale, Brand Day, Payday, Mega Bonus, Weekend, atau Lokal.
- **Toko**: Etalase marketplace yang menjadi sasaran sebuah Campaign.
- **Papan_Campaign**: Tampilan papan Kanban yang menampilkan seluruh Campaign sebagai Kartu_Campaign yang dikelompokkan ke dalam Kolom_Status.
- **Kolom_Status**: Kolom pada Papan_Campaign yang mengelompokkan Kartu_Campaign menurut satu nilai Campaign_Status.
- **Kartu_Campaign**: Representasi visual ringkas sebuah Campaign pada Papan_Campaign.
- **Tambah_Cepat**: Kontrol yang memungkinkan Admin membuat Campaign_Draft baru hanya dengan memasukkan nama campaign.
- **Editor_Inline**: Mekanisme penyuntingan field Campaign langsung pada Kartu_Campaign atau Panel_Detail tanpa membuka halaman terpisah.
- **Panel_Detail**: Panel samping yang menampilkan dan memungkinkan penyuntingan seluruh field sebuah Campaign tanpa meninggalkan Papan_Campaign.
- **Template_Campaign**: Kumpulan nilai Skema_Campaign yang tersimpan dan dapat dipakai ulang untuk membuat Campaign baru secara cepat.
- **Layanan_Aksi_Massal**: Komponen yang menerapkan satu perubahan ke beberapa Campaign yang dipilih secara bersamaan.
- **Palet_Perintah**: Antarmuka pencarian perintah yang dipanggil dengan pintasan keyboard untuk menjalankan aksi tanpa menggunakan tetikus.
- **Pintasan_Keyboard**: Kombinasi tombol yang memicu aksi Sistem tertentu.
- **Layanan_Pencarian**: Komponen yang menyaring dan mencari Campaign pada Papan_Campaign berdasarkan kriteria yang dimasukkan pengguna.
- **Layanan_Penyimpanan_Otomatis**: Komponen yang menyimpan perubahan Campaign secara otomatis tanpa tindakan simpan eksplisit.
- **Transisi_Valid**: Perpindahan Campaign_Status yang diizinkan oleh aturan siklus hidup sebagaimana didefinisikan pada Requirement 9.

## Requirements

### Requirement 1: Autentikasi dan Akses Berbasis Peran

**User Story:** Sebagai pengguna, saya ingin masuk dengan aman dan hanya melihat aksi sesuai peran saya, agar SPV dan Admin bekerja pada ruang lingkup yang tepat.

#### Acceptance Criteria

1. WHEN seorang pengguna mengirim kredensial yang cocok dengan akun terdaftar, THE Layanan_Autentikasi SHALL membangun sesi terautentikasi dan memberikan akses ke modul dan aksi yang diizinkan untuk peran pengguna dalam waktu 3 detik.
2. IF seorang pengguna mengirim kredensial yang tidak cocok dengan akun terdaftar, THEN THE Layanan_Autentikasi SHALL menolak akses, mempertahankan pengguna pada layar masuk, dan menampilkan pesan kesalahan yang menyatakan kredensial tidak valid.
3. IF seorang pengguna mencapai 5 percobaan masuk gagal berturut-turut pada akun yang sama, THEN THE Layanan_Autentikasi SHALL mengunci akun tersebut selama 15 menit, menolak setiap percobaan masuk selama periode penguncian, dan menampilkan pesan kesalahan yang menyatakan akun terkunci sementara.
4. WHILE seorang pengguna tidak memiliki sesi terautentikasi aktif, THE Sistem SHALL membatasi akses ke seluruh modul kecuali layar masuk.
5. WHEN sesi terautentikasi telah mencapai masa berlaku 8 jam atau telah tidak aktif selama 30 menit, THE Layanan_Autentikasi SHALL mengakhiri sesi tersebut dan mengarahkan pengguna ke layar masuk.
6. WHEN seorang pengguna terautentikasi yang ditugaskan peran Admin meminta untuk membuat, menyunting, memindahkan, menduplikasi, atau menghapus Campaign, THE Layanan_Akses SHALL mengizinkan aksi yang diminta.
7. WHEN seorang pengguna terautentikasi yang ditugaskan peran SPV meminta untuk membuat Template_Campaign, meninjau Campaign, atau menyetujui Campaign, THE Layanan_Akses SHALL mengizinkan aksi yang diminta.
8. IF seorang pengguna meminta aksi yang tidak diizinkan untuk perannya, THEN THE Layanan_Akses SHALL menolak aksi tersebut, membiarkan seluruh data terkait tidak berubah, dan menampilkan pesan kesalahan yang menyatakan pengguna tidak berwenang melakukan aksi tersebut.

### Requirement 2: Papan Campaign Bergaya Kanban

**User Story:** Sebagai Admin, saya ingin melihat seluruh campaign sebagai kartu pada papan berkolom status, agar saya dapat memahami dan mengelola pekerjaan secara sekilas seperti pada Trello atau ClickUp.

#### Acceptance Criteria

1. WHEN seorang Admin membuka Papan_Campaign, THE Papan_Campaign SHALL menampilkan tepat lima Kolom_Status dalam urutan kiri-ke-kanan: Menunggu, Proses, Review, Live, Selesai.
2. WHEN seorang Admin membuka Papan_Campaign, THE Papan_Campaign SHALL menempatkan setiap Campaign sebagai satu Kartu_Campaign pada Kolom_Status yang sesuai dengan nilai Campaign_Status Campaign tersebut.
3. THE Kartu_Campaign SHALL menampilkan nama Campaign, Campaign_Category, jumlah Opsi_Promo, jumlah Toko target, dan rentang tanggal Campaign (tanggal mulai dan tanggal selesai).
4. THE Papan_Campaign SHALL memberi kode warna pada setiap Kartu_Campaign sesuai dengan Campaign_Category Campaign tersebut.
5. IF Campaign_Category sebuah Campaign tidak memiliki kode warna yang terdaftar, THEN THE Papan_Campaign SHALL menampilkan Kartu_Campaign tersebut dengan warna default netral yang seragam.
6. THE Kolom_Status SHALL menampilkan jumlah Kartu_Campaign yang dikandungnya, sebagai bilangan bulat 0 hingga jumlah total Campaign, pada judul kolom.
7. WHEN data Campaign yang mendasari berubah, THE Papan_Campaign SHALL menampilkan susunan Kartu_Campaign yang diperbarui dalam waktu 2 detik sejak pemuatan atau penyegaran.
8. WHERE sebuah Kolom_Status memuat nol Campaign karena tidak ada Campaign berstatus tersebut dan bukan akibat penyaringan aktif atau pemuatan data yang sedang berlangsung, THE Papan_Campaign SHALL menampilkan kolom tersebut dengan pesan keadaan-kosong yang menyatakan tidak ada campaign pada status itu.
9. IF nilai Campaign_Status sebuah Campaign kosong atau tidak termasuk salah satu dari lima nilai Kolom_Status, THEN THE Papan_Campaign SHALL menempatkan Kartu_Campaign tersebut pada Kolom_Status Menunggu dan menahan penempatan di kolom lain.
10. IF pemuatan data Campaign gagal, THEN THE Papan_Campaign SHALL menampilkan pesan kesalahan yang menyatakan data campaign gagal dimuat, mempertahankan susunan Kartu_Campaign terakhir yang berhasil ditampilkan, dan tidak menampilkan kolom dalam keadaan kosong palsu.

### Requirement 3: Tambah Cepat Campaign

**User Story:** Sebagai Admin, saya ingin membuat campaign baru hanya dengan mengetik namanya, agar input campaign tidak memakan waktu lama.

#### Acceptance Criteria

1. WHEN seorang Admin mengaktifkan Tambah_Cepat pada sebuah Kolom_Status dan mengirim nama campaign yang setelah pemangkasan spasi di awal dan akhir memiliki panjang 1 sampai 100 karakter, THE Sistem SHALL membuat sebuah Campaign_Draft dengan nama tersebut, menetapkan Campaign_Status menjadi Menunggu, dan menampilkannya sebagai Kartu_Campaign baru pada Kolom_Status tersebut dalam waktu 1 detik.
2. WHEN THE Sistem berhasil membuat Campaign_Draft melalui Tambah_Cepat, THE Tambah_Cepat SHALL mengosongkan field input nama dalam waktu 1 detik.
3. WHEN THE Sistem berhasil membuat Campaign_Draft melalui Tambah_Cepat, THE Tambah_Cepat SHALL tetap aktif dan siap menerima nama campaign berikutnya tanpa memerlukan pembukaan ulang kontrol.
4. IF seorang Admin mengirim Tambah_Cepat dengan nama yang setelah pemangkasan spasi di awal dan akhir memiliki panjang 0 karakter, THEN THE Sistem SHALL menolak pembuatan Campaign, mempertahankan Tambah_Cepat dalam keadaan aktif dengan input yang dikirim tetap ditampilkan, dan menampilkan pesan validasi yang menyatakan bahwa nama campaign wajib diisi.
5. IF seorang Admin mengirim Tambah_Cepat dengan nama yang setelah pemangkasan spasi di awal dan akhir memiliki panjang lebih dari 100 karakter, THEN THE Sistem SHALL menolak pembuatan Campaign, mempertahankan Tambah_Cepat dalam keadaan aktif dengan input yang dikirim tetap ditampilkan, dan menampilkan pesan validasi yang menyatakan bahwa nama campaign maksimum 100 karakter.
6. IF pembuatan Campaign_Draft melalui Tambah_Cepat gagal karena kesalahan sistem, THEN THE Sistem SHALL membatalkan pembuatan tanpa menambahkan Kartu_Campaign baru, mempertahankan Tambah_Cepat dalam keadaan aktif dengan input yang dikirim tetap ditampilkan, dan menampilkan pesan kesalahan yang menyatakan bahwa pembuatan campaign gagal.

### Requirement 4: Penyuntingan Inline dan Penyimpanan Otomatis

**User Story:** Sebagai Admin, saya ingin menyunting field campaign langsung tanpa membuka form panjang dan tanpa menekan tombol simpan, agar perubahan tersimpan cepat.

#### Acceptance Criteria

1. WHEN seorang Admin memasukkan nilai yang valid pada sebuah field Campaign yang dapat disunting pada Editor_Inline dan menyelesaikan penyuntingan dengan memindahkan fokus keluar dari field (blur) atau menekan tombol Enter, THE Layanan_Penyimpanan_Otomatis SHALL menyimpan nilai baru dalam waktu 1 detik.
2. WHEN THE Layanan_Penyimpanan_Otomatis berhasil menyimpan sebuah perubahan, THE Sistem SHALL menampilkan indikator visual bahwa perubahan telah tersimpan dalam waktu 1 detik setelah penyimpanan berhasil.
3. WHILE THE Layanan_Penyimpanan_Otomatis sedang memproses penyimpanan sebuah perubahan, THE Sistem SHALL menampilkan indikator visual bahwa penyimpanan sedang berlangsung.
4. IF seorang Admin memasukkan nilai yang melanggar batasan field melalui Editor_Inline dan menyelesaikan penyuntingan dengan memindahkan fokus keluar dari field (blur) atau menekan tombol Enter, THEN THE Sistem SHALL menolak nilai tersebut tanpa memicu penyimpanan otomatis, mempertahankan nilai sebelumnya, dan menampilkan pesan validasi yang mengidentifikasi field yang tidak valid dalam waktu 1 detik.
5. IF THE Layanan_Penyimpanan_Otomatis tidak menyelesaikan penyimpanan sebuah perubahan dalam waktu 10 detik, THEN THE Sistem SHALL memperlakukan operasi sebagai gagal, mempertahankan nilai yang dimasukkan pada Editor_Inline, dan menampilkan pesan kesalahan yang menyatakan bahwa perubahan belum tersimpan.

### Requirement 5: Panel Detail Campaign

**User Story:** Sebagai Admin, saya ingin membuka detail lengkap sebuah campaign pada panel samping, agar saya dapat melengkapi seluruh field tanpa meninggalkan papan.

#### Acceptance Criteria

1. WHEN seorang Admin memilih sebuah Kartu_Campaign, THE Panel_Detail SHALL menampilkan field Campaign berupa nama, Campaign_Category, tanggal mulai, tanggal selesai, daftar Toko target, dan daftar Opsi_Promo dalam waktu 1 detik tanpa menyembunyikan Papan_Campaign.
2. WHEN seorang Admin menyunting sebuah field pada Panel_Detail dengan nilai yang lolos seluruh aturan validasi yang berlaku untuk field tersebut, THE Layanan_Penyimpanan_Otomatis SHALL menyimpan nilai baru dan THE Papan_Campaign SHALL menampilkan Kartu_Campaign yang diperbarui dalam waktu 1 detik.
3. IF seorang Admin menyunting sebuah field pada Panel_Detail dengan nilai yang tidak lolos aturan validasi, yaitu nama kosong, nama melebihi 100 karakter, atau tanggal selesai mendahului tanggal mulai, THEN THE Sistem SHALL menolak nilai tersebut, mempertahankan nilai sebelumnya, dan menampilkan pesan validasi yang menyatakan aturan yang dilanggar.
4. WHEN seorang Admin menambahkan sebuah Opsi_Promo pada Panel_Detail dengan persentase diskon bilangan bulat dalam rentang 0 sampai 100, THE Sistem SHALL menambahkan Opsi_Promo ke Skema_Campaign hingga maksimum 20 Opsi_Promo.
5. IF seorang Admin menambahkan Opsi_Promo ketika Skema_Campaign telah memuat 20 Opsi_Promo, THEN THE Sistem SHALL menolak penambahan dan menampilkan pesan yang menyatakan maksimum 20 Opsi_Promo telah tercapai.
6. IF seorang Admin memasukkan persentase diskon Opsi_Promo di luar rentang 0 sampai 100 atau bukan bilangan bulat, THEN THE Sistem SHALL menolak nilai tersebut, mempertahankan nilai sebelumnya, dan menampilkan pesan validasi yang menyatakan diskon harus bilangan bulat antara 0 dan 100.
7. IF Layanan_Penyimpanan_Otomatis gagal menyimpan nilai field yang telah lolos validasi, THEN THE Sistem SHALL mempertahankan nilai field sebelumnya, menampilkan indikasi bahwa penyimpanan gagal, dan menyediakan opsi untuk mengulang penyimpanan dalam waktu 1 detik.
8. WHEN seorang Admin meminta untuk menutup Panel_Detail, THE Sistem SHALL menutup Panel_Detail dan menampilkan kembali Papan_Campaign secara penuh dalam waktu 1 detik.

### Requirement 6: Pemindahan Campaign dengan Seret-dan-Lepas

**User Story:** Sebagai Admin, saya ingin memindahkan kartu campaign antar kolom dengan seret-dan-lepas, agar mengubah status terasa cepat dan intuitif.

#### Acceptance Criteria

1. WHEN seorang Admin menyeret sebuah Kartu_Campaign ke sebuah Kolom_Status dan perpindahan dari Campaign_Status asal ke Campaign_Status tujuan merupakan Transisi_Valid, THE Sistem SHALL memperbarui Campaign_Status Campaign menjadi nilai Kolom_Status tujuan dan menempatkan Kartu_Campaign pada kolom tersebut dalam waktu 1 detik.
2. WHEN THE Sistem memperbarui Campaign_Status melalui seret-dan-lepas, THE Sistem SHALL mencatat waktu transisi, Campaign_Status sebelumnya, Campaign_Status hasil, dan identitas Admin yang melakukan aksi.
3. IF seorang Admin melepas sebuah Kartu_Campaign pada Kolom_Status yang perpindahannya bukan Transisi_Valid, THEN THE Sistem SHALL menolak perpindahan, mempertahankan Campaign_Status asal tanpa perubahan, mengembalikan Kartu_Campaign ke Kolom_Status asal, dan menampilkan pesan yang menyatakan transisi status tidak diizinkan dalam waktu 1 detik.
4. IF seorang Admin melepas sebuah Kartu_Campaign pada Kolom_Status yang sama dengan asalnya, THEN THE Sistem SHALL mempertahankan Campaign_Status Campaign tanpa perubahan dan menempatkan kembali Kartu_Campaign pada Kolom_Status asal.
5. IF seorang Admin melepas sebuah Kartu_Campaign di luar area Kolom_Status mana pun, THEN THE Sistem SHALL mempertahankan Campaign_Status Campaign tanpa perubahan dan mengembalikan Kartu_Campaign ke Kolom_Status asal.
6. IF THE Sistem gagal menyimpan pembaruan Campaign_Status setelah perpindahan yang merupakan Transisi_Valid, THEN THE Sistem SHALL mempertahankan Campaign_Status asal, mengembalikan Kartu_Campaign ke Kolom_Status asal, dan menampilkan pesan yang menyatakan pembaruan status gagal dalam waktu 1 detik.

### Requirement 7: Template Campaign yang Dapat Dipakai Ulang

**User Story:** Sebagai Admin, saya ingin membuat campaign dari template yang sudah terisi, agar saya tidak perlu mengisi field yang sama berulang kali.

#### Acceptance Criteria

1. WHEN seorang SPV menyimpan sebuah Template_Campaign yang berisi tepat satu Campaign_Category, daftar Opsi_Promo dengan 1 sampai 50 entri, dan daftar Toko target dengan 1 sampai 1000 entri, THE Sistem SHALL menyimpan Template_Campaign tersebut dalam waktu 1 detik agar tersedia untuk pembuatan Campaign.
2. IF seorang SPV menyimpan sebuah Template_Campaign tanpa Campaign_Category, atau dengan daftar Opsi_Promo kosong, atau dengan daftar Toko target kosong, THEN THE Sistem SHALL menolak penyimpanan, tidak membuat Template_Campaign apa pun, dan menampilkan pesan yang menyatakan field wajib yang belum terisi.
3. IF seorang SPV menyimpan sebuah Template_Campaign dengan daftar Opsi_Promo melebihi 50 entri atau daftar Toko target melebihi 1000 entri, THEN THE Sistem SHALL menolak penyimpanan, tidak membuat Template_Campaign apa pun, dan menampilkan pesan yang menyatakan batas jumlah entri telah terlampaui.
4. WHEN seorang Admin membuat sebuah Campaign dari sebuah Template_Campaign yang konten-nya lolos validasi ulang atas Campaign_Category, daftar Opsi_Promo, dan daftar Toko target, THE Sistem SHALL membuat Campaign baru dengan Campaign_Category, Opsi_Promo, dan Toko target yang disalin dari Template_Campaign dan Campaign_Status Menunggu dalam waktu 1 detik.
5. WHEN THE Sistem membuat sebuah Campaign dari sebuah Template_Campaign, THE Sistem SHALL membuat Campaign sebagai salinan independen sehingga perubahan berikutnya pada Campaign tidak mengubah Template_Campaign dan perubahan pada Template_Campaign tidak mengubah Campaign yang telah dibuat.
6. IF seorang Admin membuat sebuah Campaign dari sebuah Template_Campaign yang telah dihapus, THEN THE Sistem SHALL menolak pembuatan, tidak membuat Campaign apa pun, dan menampilkan pesan yang menyatakan template tidak lagi tersedia.
7. IF konten sebuah Template_Campaign tidak lolos validasi ulang saat seorang Admin membuat Campaign darinya, THEN THE Sistem SHALL menolak pembuatan, tidak membuat Campaign apa pun, dan menampilkan pesan yang menyatakan konten template tidak valid.

### Requirement 8: Duplikasi Campaign

**User Story:** Sebagai Admin, saya ingin menduplikasi campaign yang sudah ada, agar saya dapat membuat campaign serupa tanpa input ulang.

#### Acceptance Criteria

1. WHEN seorang Admin meminta untuk menduplikasi sebuah Campaign yang tersedia, THE Sistem SHALL membuat sebuah Campaign baru dengan nilai Skema_Campaign yang identik dengan Campaign sumber, mencakup seluruh Opsi_Promo, Campaign_Category, Toko target, dan rentang tanggal, dengan Campaign_Status Menunggu, dan nama yang terdiri dari teks penanda salinan diikuti nama Campaign sumber, dalam waktu 1 detik.
2. WHEN THE Sistem menduplikasi sebuah Campaign, THE Sistem SHALL membuat Campaign hasil sebagai salinan independen sehingga perubahan pada salah satu Campaign tidak mengubah nilai Skema_Campaign maupun Campaign_Status Campaign lainnya.
3. WHEN THE Sistem menduplikasi sebuah Campaign, THE Papan_Campaign SHALL menampilkan Kartu_Campaign hasil pada Kolom_Status Menunggu dalam waktu 1 detik.
4. IF seorang Admin meminta untuk menduplikasi sebuah Campaign yang tidak lagi tersedia karena telah dihapus, THEN THE Sistem SHALL menolak duplikasi, membiarkan seluruh Campaign yang ada tidak berubah, dan menampilkan pesan kesalahan yang menyatakan Campaign sumber tidak lagi tersedia.
5. IF penambahan teks penanda salinan menyebabkan nama Campaign hasil melebihi 200 karakter, THEN THE Sistem SHALL memotong nama Campaign hasil hingga paling banyak 200 karakter sambil mempertahankan teks penanda salinan.
6. IF proses duplikasi sebuah Campaign melampaui batas waktu 1 detik, THEN THE Sistem SHALL tetap melanjutkan dan menyelesaikan duplikasi hingga Campaign hasil terbentuk tanpa membatalkan operasi.

### Requirement 9: Integritas Siklus Hidup Status Campaign

**User Story:** Sebagai pemilik sistem, saya ingin transisi status campaign tetap konsisten, agar perpindahan cepat melalui papan tidak merusak alur bisnis.

#### Acceptance Criteria

1. THE Sistem SHALL membatasi Campaign_Status pada tepat salah satu dari lima nilai: Menunggu, Proses, Review, Live, atau Selesai.
2. THE Sistem SHALL memperlakukan sebagai Transisi_Valid hanya perpindahan Campaign_Status berikut: Menunggu ke Proses, Proses ke Review, Review ke Live, Live ke Selesai, dan perpindahan mundur Proses ke Menunggu, Review ke Proses, serta Live ke Review.
3. IF sebuah perpindahan Campaign_Status yang bukan Transisi_Valid diminta, THEN THE Sistem SHALL menolak perpindahan, mempertahankan Campaign_Status saat ini tanpa perubahan, dan menampilkan pesan kesalahan yang menyatakan transisi tidak diizinkan.
4. IF sebuah perpindahan keluar dari Campaign_Status Selesai diminta, THEN THE Sistem SHALL menolak perpindahan dan mempertahankan Campaign_Status sebagai Selesai.
5. WHEN sebuah Transisi_Valid selesai, THE Sistem SHALL mencatat waktu transisi, Campaign_Status sebelumnya, Campaign_Status hasil, dan identitas pengguna yang melakukan aksi.
6. WHILE THE Sistem menerima lebih dari satu permintaan transisi Campaign_Status untuk Campaign yang sama dalam waktu hampir bersamaan, THE Sistem SHALL memproses permintaan tersebut secara berurutan dan mengevaluasi setiap permintaan terhadap Campaign_Status terkini yang telah tersimpan.
7. IF sebuah permintaan transisi Campaign_Status diajukan tanpa identitas pengguna terautentikasi, THEN THE Sistem SHALL menolak transisi, mempertahankan Campaign_Status saat ini tanpa perubahan, dan menampilkan pesan kesalahan yang menyatakan transisi memerlukan pengguna terautentikasi.

### Requirement 10: Aksi Massal

**User Story:** Sebagai Admin, saya ingin menerapkan satu perubahan ke banyak campaign sekaligus, agar saya tidak perlu mengubahnya satu per satu.

#### Acceptance Criteria

1. WHEN seorang Admin memilih antara 1 sampai 100 Kartu_Campaign dan menerapkan satu perubahan Campaign_Category, THE Layanan_Aksi_Massal SHALL memperbarui Campaign_Category pada setiap Campaign yang dipilih dalam waktu 2 detik.
2. WHEN seorang Admin memilih antara 1 sampai 100 Kartu_Campaign dan menerapkan satu perpindahan Campaign_Status, THE Layanan_Aksi_Massal SHALL menerapkan perpindahan dalam waktu 2 detik hanya pada Campaign terpilih yang perpindahannya merupakan Transisi_Valid.
3. IF satu atau lebih Campaign terpilih memiliki perpindahan Campaign_Status yang bukan Transisi_Valid, THEN THE Layanan_Aksi_Massal SHALL membiarkan setiap Campaign tersebut tidak berubah, menerapkan perpindahan pada Campaign terpilih lain yang merupakan Transisi_Valid, dan menampilkan laporan keberhasilan parsial yang mengidentifikasi jumlah Campaign yang berhasil dipindahkan beserta setiap Campaign yang tidak dapat dipindahkan beserta alasannya.
4. WHEN seorang Admin memilih antara 1 sampai 100 Kartu_Campaign dan meminta penghapusan, THE Layanan_Aksi_Massal SHALL menampilkan permintaan konfirmasi tanpa mengubah satu pun Campaign terpilih.
5. WHEN seorang Admin mengonfirmasi permintaan penghapusan, THE Layanan_Aksi_Massal SHALL menghapus setiap Campaign yang dipilih dalam waktu 2 detik dan membiarkan Campaign yang tidak dipilih tidak berubah.
6. IF seorang Admin membatalkan permintaan penghapusan, THEN THE Layanan_Aksi_Massal SHALL mempertahankan setiap Campaign terpilih dalam keadaan tidak berubah dan tidak menghapus satu pun Campaign.
7. IF seorang Admin menerapkan sebuah aksi massal tanpa memilih satu pun Kartu_Campaign, THEN THE Sistem SHALL menolak aksi dan menampilkan pesan yang menyatakan setidaknya satu campaign harus dipilih.
8. IF seorang Admin menerapkan sebuah aksi massal terhadap lebih dari 100 Kartu_Campaign, THEN THE Sistem SHALL menolak aksi, membiarkan setiap Campaign terpilih tidak berubah, dan menampilkan pesan yang menyatakan maksimum 100 campaign dapat diproses dalam satu aksi massal.

### Requirement 11: Pencarian dan Penyaringan Cepat

**User Story:** Sebagai Admin, saya ingin menyaring dan mencari campaign pada papan dengan cepat, agar saya dapat menemukan campaign yang dituju tanpa menggulir panjang.

#### Acceptance Criteria

1. WHEN seorang Admin memasukkan teks pencarian sepanjang 1 sampai 100 karakter (setelah pemangkasan spasi di awal dan akhir), THE Layanan_Pencarian SHALL menampilkan pada Papan_Campaign hanya Kartu_Campaign yang nama Campaign-nya memuat teks tersebut sebagai substring tanpa membedakan huruf besar dan kecil, dalam waktu 1 detik.
2. WHEN seorang Admin memilih satu Campaign_Category sebagai filter, THE Layanan_Pencarian SHALL menampilkan hanya Kartu_Campaign dengan Campaign_Category tersebut dalam waktu 1 detik.
3. WHILE teks pencarian dan filter Campaign_Category keduanya aktif, THE Layanan_Pencarian SHALL menampilkan hanya Kartu_Campaign yang secara bersamaan memenuhi pencocokan substring nama Campaign tanpa membedakan huruf besar dan kecil DAN memiliki Campaign_Category yang dipilih, dalam waktu 1 detik.
4. WHEN seorang Admin menghapus seluruh kriteria pencarian dan filter, THE Papan_Campaign SHALL menampilkan kembali seluruh Kartu_Campaign dalam waktu 1 detik.
5. IF teks pencarian yang dimasukkan hanya berisi spasi (kosong setelah pemangkasan spasi di awal dan akhir), THEN THE Layanan_Pencarian SHALL mengabaikan kriteria teks pencarian dan menerapkan hanya filter Campaign_Category yang aktif (jika ada) dalam waktu 1 detik.
6. IF teks pencarian yang dimasukkan melebihi 100 karakter, THEN THE Layanan_Pencarian SHALL menolak masukan tersebut, mempertahankan hasil tampilan Papan_Campaign sebelumnya tanpa perubahan, dan menampilkan indikasi kesalahan yang menyatakan bahwa teks pencarian melebihi batas panjang maksimum.
7. IF tidak ada Kartu_Campaign yang memenuhi kriteria pencarian dan filter aktif, THEN THE Papan_Campaign SHALL menyembunyikan seluruh Kartu_Campaign dan menampilkan pesan keadaan-kosong yang menyatakan tidak ada campaign yang cocok, dan THE Sistem SHALL mengizinkan indikasi kesalahan yang berlaku ditampilkan bersamaan dengan pesan keadaan-kosong tersebut.

### Requirement 12: Palet Perintah dan Pintasan Keyboard

**User Story:** Sebagai Admin, saya ingin menjalankan aksi umum melalui keyboard, agar input campaign lebih cepat tanpa harus berpindah ke tetikus.

#### Acceptance Criteria

1. WHEN seorang Admin menekan Pintasan_Keyboard untuk membuka Palet_Perintah, THE Palet_Perintah SHALL ditampilkan dengan kolom input perintah yang siap menerima ketikan dalam waktu 500 milidetik.
2. WHILE kolom input Palet_Perintah kosong, THE Palet_Perintah SHALL menampilkan daftar seluruh perintah yang tersedia hingga maksimum 50 perintah.
3. WHEN seorang Admin mengetik teks sepanjang 1 sampai 100 karakter pada Palet_Perintah, THE Palet_Perintah SHALL menampilkan daftar perintah yang labelnya memuat teks tersebut tanpa membedakan huruf besar dan kecil dalam waktu 200 milidetik.
4. IF teks yang diketik pada Palet_Perintah tidak cocok dengan satu pun label perintah, THEN THE Palet_Perintah SHALL menampilkan indikasi bahwa tidak ada perintah yang cocok dan tetap terbuka.
5. WHEN seorang Admin memilih sebuah perintah pada Palet_Perintah, THE Sistem SHALL menjalankan perintah terpilih dan menutup Palet_Perintah.
6. IF sebuah perintah yang dipilih gagal dijalankan, THEN THE Sistem SHALL menampilkan indikasi kesalahan, tetap membuka Palet_Perintah, dan tidak mengubah data Campaign.
7. WHEN sebuah perintah yang dipilih berhasil dijalankan, THE Sistem SHALL mengizinkan perintah tersebut mengubah data Campaign sesuai fungsinya.
8. WHEN seorang Admin menekan Pintasan_Keyboard untuk Tambah_Cepat, THE Sistem SHALL mengaktifkan kontrol Tambah_Cepat dengan kursor siap menerima nama campaign dalam waktu 500 milidetik.
9. WHEN seorang Admin menekan Pintasan_Keyboard untuk menutup Palet_Perintah, THE Sistem SHALL menutup Palet_Perintah tanpa menjalankan perintah apa pun dan mengembalikan fokus ke elemen yang aktif sebelum Palet_Perintah dibuka.

### Requirement 13: Tata Letak Antarmuka dan Bahasa

**User Story:** Sebagai pengguna, saya ingin antarmuka yang konsisten dalam Bahasa Indonesia dengan gaya pastel yang ringan, agar nyaman digunakan dalam pekerjaan sehari-hari.

#### Acceptance Criteria

1. THE Sistem SHALL menampilkan seluruh label, menu, tombol, pesan status, dan pesan kesalahan yang dihadapkan ke pengguna dalam Bahasa Indonesia pada setiap modul dan layar.
2. WHERE sebuah elemen teks merupakan nama merek, nama produk, atau data yang dimasukkan pengguna, THE Sistem SHALL menampilkan teks tersebut sebagaimana adanya tanpa penerjemahan.
3. THE Sistem SHALL menampilkan antarmuka pada seluruh modul dan layar secara konsisten menggunakan tema light-mode dengan palet warna pastel yang sama.
4. WHEN seorang pengguna terautentikasi memuat antarmuka untuk pertama kali pada sebuah sesi, THE Sistem SHALL menampilkan Papan_Campaign sebagai tampilan utama pada area konten dalam waktu paling lama 3 detik.
5. WHILE seorang pengguna terautentikasi menggunakan aplikasi dan belum memilih modul lain, THE Sistem SHALL mempertahankan Papan_Campaign sebagai tampilan aktif pada area konten.
6. WHEN seorang pengguna terautentikasi memuat antarmuka, THE Sistem SHALL menampilkan hanya modul dan aksi yang diizinkan untuk peran pengguna sebagaimana didefinisikan pada Requirement 1.
7. IF sebuah aksi tidak diizinkan untuk peran pengguna sementara modul yang memuatnya mengandung aksi lain yang diizinkan, THEN THE Sistem SHALL tidak merender aksi yang tidak diizinkan tersebut sambil tetap menampilkan modul beserta aksi yang diizinkan.
8. IF sebuah modul tidak diizinkan untuk peran pengguna, THEN THE Sistem SHALL tidak merender modul tersebut beserta seluruh aksi di dalamnya.
