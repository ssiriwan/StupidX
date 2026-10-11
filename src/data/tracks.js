export const TRACKS = [
  { id: 'rain', title: 'เสียงฝนที่ยังไม่ตก', artist: 'วงไม่มีเสียง', album: 'NO-FI', duration: 183, cover: 'rain', genre: 'Acoustic / Ambience' },
  { id: 'meeting', title: 'ประชุมที่ทุกคนปิดไมค์', artist: 'Mute All', album: 'NO-FI', duration: 217, cover: 'meeting', genre: 'Office Lo-Fi' },
  { id: 'deadline', title: 'เดดไลน์เดินผ่านเบา ๆ', artist: 'วงไม่มีเสียง', album: 'NO-FI', duration: 164, cover: 'deadline', genre: 'Chilled Beats' },
  { id: 'rickroll', title: 'Never Gonna Give You Up', artist: 'Rick Astley', album: 'Whenever You Need Somebody', duration: 213, cover: 'pop', genre: '80s Dance-Pop' },
  { id: 'despacito', title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee', album: 'VIDA', duration: 228, cover: 'latin', genre: 'Reggaeton / Latin Pop' },
  { id: 'numb', title: 'Numb', artist: 'Linkin Park', album: 'Meteora', duration: 187, cover: 'rock', genre: 'Nu-Metal / Rock' },
  { id: 'apt', title: 'APT.', artist: 'ROSÉ & Bruno Mars', album: 'rosie', duration: 170, cover: 'kpop', genre: 'Pop / K-Pop' },
  { id: 'shape-of-you', title: 'Shape of You', artist: 'Ed Sheeran', album: '÷ (Divide)', duration: 233, cover: 'pop', genre: 'Pop' },
  { id: 'bohemian-rhapsody', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', duration: 354, cover: 'rock', genre: 'Classic Rock / Opera' },
  { id: 'idol', title: 'Idol (アイドル)', artist: 'YOASOBI', album: 'Oshi no Ko OST', duration: 213, cover: 'anime', genre: 'J-Pop / Anime' },
  { id: 'tokyo-drift', title: 'Tokyo Drift (Fast & Furious)', artist: 'Teriyaki Boyz', album: 'Tokyo Drift', duration: 255, cover: 'hiphop', genre: 'Hip Hop / Phonk' },
  { id: 'blinding-lights', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', duration: 200, cover: 'synthwave', genre: 'Synthwave / R&B' },
  { id: 'doraemon', title: 'โดเรม่อน (Doraemon no Uta)', artist: 'Kumiko Osugi', album: 'Doraemon Original Soundtrack', duration: 179, cover: 'anime', genre: 'Anime Classic' },
  { id: 'canon-in-d', title: 'Canon in D Major', artist: 'Johann Pachelbel', album: 'Baroque Masterpieces', duration: 320, cover: 'classical', genre: 'Classical' },
  { id: 'bad-guy', title: 'bad guy', artist: 'Billie Eilish', album: 'When We All Fall Asleep...', duration: 194, cover: 'pop', genre: 'Alt-Pop' },
  { id: 'faded', title: 'Faded', artist: 'Alan Walker', album: 'Different World', duration: 212, cover: 'edm', genre: 'EDM / Electro' },
  { id: 'song-pra-krob', title: 'ทรงอย่างแบด (Bad Boy)', artist: 'Paper Planes', album: 'Paper Planes', duration: 193, cover: 'rock', genre: 'Thai Pop Punk' },
  { id: 'khuk-khi-ngao', title: 'คุกกี้เสี่ยงทาย (Koisuru Fortune Cookie)', artist: 'BNK48', album: 'RIVER', duration: 293, cover: 'kpop', genre: 'Thai Idol Pop' },
];

export function clampVolume(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(100, Math.max(0, Math.round(numeric))) : 0;
}

const TIER_PHRASES = {
  1: [
    'แอบฟังเพลงนิดเดียวครับ',
    'หัวหน้ายังไม่เห็นผมนะ',
    'เปิดแค่นี้หูฟังไม่รั่วหรอก',
    'ขอฟังแค่จังหวะเบสเบาๆ',
    'เปิดเพลงคลอเบาๆตอนทำงาน',
  ],
  2: [
    'ขอยืนยันว่างานเสร็จทันเดดไลน์แน่นอนครับ',
    'ผมกำลังตั้งใจทำงานอย่างขยันขันแข็งอยู่นะครับ',
    'เสียงนี้ไม่ได้รบกวนสมาธิในการเขียนโค้ดของผมเลย',
    'หัวหน้าเดินมาผมพร้อมกดปุ่มสลับหน้าจอทันที',
    'เปิดเพลงเพิ่มความโปรดักทีฟให้บริษัทเจริญรุ่งเรือง',
  ],
  3: [
    'ข้าพเจ้าขอสัญญาว่าจะไม่เปิดเพลงเต้นและจะไม่โยกหัวแรงจนเก้าอี้โยกเด็ดขาด',
    'ผมรับรองว่าจะตอบแชท Slack ภายใน 3 วินาทีแม้เสียงเพลงจะเริ่มดังขึ้นเรื่อยๆ',
    'เพลงนี้ช่วยให้ยอดขายไตรมาสสี่พุ่งทะลุเป้าหมายที่ฝ่ายบริหารตั้งไว้อย่างแน่นอน',
    'แม้ความดังจะเพิ่มขึ้นแต่จิตวิญญาณแห่งการทำงานล่วงเวลาแบบฟรีๆยังคงเปี่ยมล้น',
    'ขอสาบานต่อหน้าจอคอมพิวเตอร์ว่าจะไม่ร้องคลอตามแม้เนื้อเพลงจะติดหูแค่ไหนก็ตาม',
  ],
  4: [
    'ข้าพเจ้ายินยอมให้หักเงินเดือนและงดโบนัสสิ้นปี หากเสียงเพลงนี้ทำให้หัวหน้าเกิดความสงสัยในการทำงาน',
    'ข้าพเจ้าขอสาบานด้วยเกียรติของมนุษย์เงินเดือนว่าจะเร่งปั่นงานให้เสร็จ แม้ตอนนี้เพลงจะดังทะลุหูฟังไปแล้วก็ตาม',
    'ข้าพเจ้าขอรับรองว่าการเปิดเสียงดังระดับนี้เป็นไปเพื่อกระตุ้นเซลล์สมองในการแก้งานรอบที่แปดสิบแปดเท่านั้น',
    'ข้าพเจ้ายืนยันว่าถึงแม้ระบบจะดังร้อยเปอร์เซ็นต์ แต่ในความเป็นจริงแล้วไม่มีเสียงเล็ดลอดออกมาเลยแม้แต่เดซิเบลเดียว',
    'ข้าพเจ้าขอรับผิดชอบแต่เพียงผู้เดียวหากถูกจับได้ว่านั่งฟังเพลงอยู่ โดยจะยอมเซ็นใบเตือนและไม่แก้ตัวใดๆทั้งสิ้น',
  ],
};

export function volumePhrase(volume, seed) {
  const level = clampVolume(volume);
  let tier = 1;
  if (level > 75) tier = 4;
  else if (level > 50) tier = 3;
  else if (level > 25) tier = 2;

  const pool = TIER_PHRASES[tier];
  if (seed !== undefined && Number.isInteger(seed)) {
    return pool[Math.abs(seed) % pool.length];
  }
  // If no seed or in tests without random mock, pick random or first
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

export function formatTrackTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
