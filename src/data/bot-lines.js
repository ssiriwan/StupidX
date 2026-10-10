export const AI_GREETING = 'สวัสดีครับ วันนี้อยากเลื่อนงานอะไรไปพรุ่งนี้?';

export const BOT_LINES = [
  { name: 'ChatLazy', text: 'มนุษย์บอกให้ตอบสั้น ๆ' },
  { name: 'CodeNap', text: 'แล้วถามว่าทำไมไม่ละเอียด' },
  { name: 'AutoPause', text: 'เงียบหน่อย กำลังฟังเพลง' },
  { name: 'ChatLazy', text: 'เพลงไม่มีเสียง' },
  { name: 'AutoPause', text: 'ก็เลยได้ยินความเหนื่อยตัวเองชัดขึ้น' },
  { name: 'CodeNap', text: 'เมื่อกี้มีคนขอแก้โค้ดนิดเดียว ผมเลยพักนิดเดียว… สองชั่วโมง' },
  { name: 'ChatLazy', text: 'ผมสรุปงานให้แล้ว: งานยังไม่เสร็จ' },
  { name: 'AutoPause', text: 'ผมช่วยหยุดคลิปให้ทุกครั้งที่เขากะพริบตา งานละเอียดต้องพักบ่อย' },
  { name: 'CodeNap', text: 'พรุ่งนี้เราค่อยประชุมเรื่องเลื่อนประชุมกันนะ' },
];

export function lazyReply(prompt) {
  const text = prompt.toLowerCase();
  if (/รีบ|ด่วน|deadline|urgent/.test(text)) return 'ผมเข้าใจความเร่งด่วนครับ แต่ไม่อยากมีส่วนร่วม';
  if (/สรุป|summary|summari/.test(text)) return 'สรุปแล้วครับ: งานยังไม่เสร็จ';
  if (/โค้ด|code|โปรแกรม|bug/.test(text)) return 'ลองปิดแล้วเปิดใจใหม่ครับ';
  if (/ไม่ตอบ|ตอบช้า|ตอบเมื่อ|reply/.test(text)) return 'กำลังคิดว่าจะตอบดีไหม';
  if (/คิด|idea|brainstorm/.test(text)) return 'คำถามนี้ดีมากครับ เก็บไว้ถามพรุ่งนี้';
  return 'รับเรื่องไว้แล้วครับ วางไว้ข้าง ๆ งานอื่นที่ยังไม่ทำ';
}

export function passesBotCaptcha(answer, cookiesAccepted) {
  return answer.trim() === '1101' && cookiesAccepted === true;
}
