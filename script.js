// Menginisialisasi ikon Lucide
// Ini wajib dipanggil agar tag <i data-lucide="..."> berubah menjadi gambar ikon SVG
lucide.createIcons();

// Contoh interaksi sederhana: Menampilkan pesan di Console saat tombol diklik
const buttons = document.querySelectorAll(".btn-primary");
buttons.forEach((button) => {
  button.addEventListener("click", (e) => {
    // Mencegah link berpindah halaman (default action) untuk demo
    e.preventDefault();

    console.log("Tombol utama diklik!");
    // Anda bisa menambahkan logika lain di sini,
    // misalnya membuka modal, scroll ke section tertentu, dll.
  });
});
