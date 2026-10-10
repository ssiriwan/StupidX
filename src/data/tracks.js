export const TRACKS = [
  { id: 'rain', title: 'เสียงฝนที่ยังไม่ตก', artist: 'วงไม่มีเสียง', album: 'NO-FI', duration: 183, cover: 'rain' },
  { id: 'meeting', title: 'ประชุมที่ทุกคนปิดไมค์', artist: 'Mute All', album: 'NO-FI', duration: 217, cover: 'meeting' },
  { id: 'deadline', title: 'เดดไลน์เดินผ่านเบา ๆ', artist: 'วงไม่มีเสียง', album: 'NO-FI', duration: 164, cover: 'deadline' },
];

export function clampVolume(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(100, Math.max(0, Math.round(numeric))) : 0;
}

export function volumePhrase(volume) {
  const level = clampVolume(volume);
  if (level <= 25) return 'เบาหน่อย';
  if (level <= 50) return 'ขออนุญาตเพิ่มเสียงในห้องสมุด';
  if (level <= 75) return 'ขออนุญาตเพิ่มเสียงในห้องสมุด โดยสัญญาว่าจะเงียบเหมือนเดิม';
  return 'ข้าพเจ้าขอรับรองว่าจะไม่สร้างเสียงรบกวน แม้กำลังเพิ่มเสียงจนสุดก็ตาม';
}

export function formatTrackTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
