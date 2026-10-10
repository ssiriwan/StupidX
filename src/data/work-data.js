export const workProjects = Object.freeze([
  { name: 'ปรับปรุงระบบ', owner: 'ทีม A', status: 'ดำเนินการ', progress: 65, due: '15 ต.ค. 2026' },
  { name: 'จัดทำรายงาน', owner: 'ทีม B', status: 'ตรวจทาน', progress: 80, due: '18 ต.ค. 2026' },
  { name: 'ทดสอบระบบ', owner: 'ทีม C', status: 'ดำเนินการ', progress: 42, due: '22 ต.ค. 2026' },
  { name: 'อัปเดตเอกสาร', owner: 'ทีม A', status: 'เสร็จสิ้น', progress: 100, due: '10 ต.ค. 2026' },
]);
export const workAverage = workProjects.reduce((sum, project) => sum + project.progress, 0) / workProjects.length;
export const workTotal = workProjects.reduce((sum, project) => sum + project.progress, 0);
