#!/usr/bin/env node
/**
 * One-off: replace common Indonesian apiError / user-facing strings with English in src/.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(import.meta.dirname, '..', 'src');

const REPLACEMENTS = [
  ['Gagal membuat order', 'Failed to create order'],
  ['Gagal mengambil order', 'Failed to fetch orders'],
  ['Gagal membatalkan order', 'Failed to cancel order'],
  ['Gagal mengambil data', 'Failed to fetch data'],
  ['Gagal mengupdate', 'Failed to update'],
  ['Gagal menghapus', 'Failed to delete'],
  ['Gagal membuat service', 'Failed to create service'],
  ['Gagal sync dari supplier', 'Failed to sync from supplier'],
  ['Gagal sync server services', 'Failed to sync server services'],
  ['Gagal memeriksa duplicate order', 'Failed to check for duplicate order'],
  ['Gagal cek saldo API supplier', 'Failed to check supplier API balance'],
  ['Layanan tidak ditemukan atau tidak aktif', 'Service not found or inactive'],
  ['Service tidak ditemukan', 'Service not found'],
  ['Service tidak aktif', 'Service is not active'],
  ['Wallet tidak ditemukan', 'Wallet not found'],
  ['Saldo tidak cukup. Top-up dulu ya.', 'Insufficient balance. Please top up first.'],
  ['API tidak ditemukan', 'API provider not found'],
  ['API tidak aktif', 'API provider is not active'],
  ['Order tidak ditemukan', 'Order not found'],
  ['Group tidak ditemukan', 'Group not found'],
  ['Box tidak ditemukan', 'Box not found'],
  ['Akses ditolak', 'Access denied'],
  ['Forbidden', 'Forbidden'],
  ['serviceId wajib diisi', 'serviceId is required'],
  ['Field ${r.label} wajib diisi', 'Field ${r.label} is required'],
  ['wajib diisi', 'is required'],
  ['Pilih minimal 1 service', 'Select at least one service'],
  ['Pilih minimal 1 service untuk diimport.', 'Select at least one service to import.'],
  ['Semua service sudah diimport sebelumnya', 'All services were already imported'],
  ['service berhasil diimport', 'services imported successfully'],
  ['Disable saja.', 'Disable it instead.'],
  ['Hapus service dulu.', 'Delete the services first.'],
  ['masih terhubung', 'still linked'],
  ['Cek saldo hanya untuk DhruFusion Classic', 'Balance check is only available for DhruFusion Classic'],
  ['ID service wajib diisi', 'Service ID is required'],
  ['IMEI wajib 15-17 digit', 'IMEI must be 15-17 digits'],
  ['ID order wajib diisi', 'Order ID is required'],
  ['Saldo tidak cukup', 'Insufficient balance'],
  ['Order yang sedang diproses atau selesai tidak bisa dibatalkan', 'Orders in progress or completed cannot be cancelled'],
  ['Gagal membuat order', 'Failed to create order'],
  ['Gagal mengambil service', 'Failed to fetch service'],
  ['Gagal membuat server box', 'Failed to create server box'],
  ['Gagal membuat group', 'Failed to create group'],
  ['Gagal mengambil group', 'Failed to fetch group'],
  ['Gagal membuat API', 'Failed to create API provider'],
  ['Gagal import', 'Import failed'],
  ['Gagal import services', 'Failed to import services'],
  ['Gagal mengambil service list dari supplier', 'Failed to fetch service list from supplier'],
  ['Gagal mengambil info akun supplier', 'Failed to fetch supplier account info'],
  ['API provider tidak ditemukan', 'API provider not found'],
  ['Service group tidak ditemukan', 'Service group not found'],
  ['Data order tidak valid', 'Invalid order data'],
  ['Dibatalkan oleh user', 'Cancelled by user'],
  ['Username atau API access key tidak valid', 'Invalid username or API access key'],
  ['Autentikasi gagal', 'Authentication failed'],
  ['Action tidak didukung:', 'Unsupported action:'],
  ['Layanan tidak ditemukan', 'Service not found'],
  ['Gagal mengambil layanan', 'Failed to fetch services'],
  ['Gagal mengambil layanan IMEI', 'Failed to fetch IMEI services'],
  ['Gagal memproses antrian order IMEI', 'Failed to process IMEI order queue'],
  ['Tidak ada layanan server dari supplier', 'No server services from supplier'],
  ['REST API Pro tidak tersedia', 'REST API Pro is not available'],
  ['Layanan belum terhubung ke supplier (toolId kosong).', 'Service is not linked to supplier (missing toolId).'],
  ['API supplier tidak aktif atau bukan DhruFusion — perlu proses manual oleh admin.', 'Supplier API is inactive or not DhruFusion — requires manual processing by admin.'],
  ['Supplier API tidak tersedia', 'Supplier API unavailable'],
  ['Gagal submit ke supplier', 'Failed to submit to supplier'],
  ['Referensi supplier duplikat', 'Duplicate supplier reference'],
  ['Belum ada referenceId supplier', 'No supplier referenceId yet'],
  ['Ditolak supplier', 'Rejected by supplier'],
  ['Layanan belum dikonfigurasi field order. Hubungi admin.', 'Service order fields are not configured. Contact admin.'],
  [' tidak valid', ' is invalid'],
  [' harus angka positif', ' must be a positive number'],
  ['Email tidak bisa diubah', 'Email cannot be changed'],
  ['Saldo kurang', 'Insufficient balance'],
  ['Pilih layanan server lalu submit order pertama Anda.', 'Choose a server service and submit your first order.'],
  ['Pilih layanan IMEI lalu submit order pertama Anda.', 'Choose an IMEI service and submit your first order.'],
  ['Batal', 'Cancel'],
  ['Memproses…', 'Processing…'],
  ['Lanjutkan order', 'Continue order'],
  ['Nama layanan yang tampil ke user', 'Service name shown to users'],
  ['Tulis deskripsi layanan…', 'Write service description…'],
  ['Cari berdasarkan nama, grup, atau ID…', 'Search by name, group, or ID…'],
  [' dipilih · ', ' selected · '],
  ['Harga (supplier)', 'Price (supplier)'],
  ['Tidak ada service yang cocok dengan filter.', 'No services match the filter.'],
  ['harga jual (IDR) tampil di katalog publik.', 'retail price (IDR) shown in the public catalog.'],
  ['[Stress mock] Order server gagal, dana dikembalikan', '[Stress mock] Server order failed, funds refunded'],
  ['[Stress mock] Order gagal, dana dikembalikan', '[Stress mock] Order failed, funds refunded'],
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'landing') continue;
      walk(p, files);
    } else if (/\.(ts|tsx)$/.test(name)) {
      files.push(p);
    }
  }
  return files;
}

let changed = 0;
for (const file of walk(ROOT)) {
  let text = fs.readFileSync(file, 'utf8');
  const orig = text;
  for (const [from, to] of REPLACEMENTS) {
    text = text.split(from).join(to);
  }
  if (text !== orig) {
    fs.writeFileSync(file, text);
    changed++;
  }
}

console.log(`Updated ${changed} files`);
