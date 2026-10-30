import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { slotLabels } from '../api';

export const VIEWS = { batch: 'Batch', faculty: 'Faculty', room: 'Room' };

export function cellText(s, view) {
  const code = `${s.subject_code}${s.type === 'lab' ? ' (Lab)' : ''}`;
  if (view === 'batch') return [code, s.faculty_name, s.room_name].join('\n');
  if (view === 'faculty') return [code, s.batch_name, s.room_name].join('\n');
  return [code, s.batch_name, s.faculty_name].join('\n');
}

/** grid[day][slot] = [{ s, cont }] ; cont = second or later slot of a multi-slot session */
export function buildGrid(tt, view, id) {
  const D = tt.config.days.length, S = tt.config.slotsPerDay;
  const grid = Array.from({ length: D }, () => Array.from({ length: S }, () => []));
  tt.sessions.filter((s) => s[`${view}_id`] === id).forEach((s) => {
    for (let t = 0; t < s.length; t++) grid[s.day][s.slot + t]?.push({ s, cont: t > 0 });
  });
  return grid;
}

export function matrix(tt, view, id) {
  const grid = buildGrid(tt, view, id), labels = slotLabels(tt.config);
  return {
    header: ['Time', ...tt.config.days],
    rows: labels.map((t, si) => [t, ...tt.config.days.map((_, d) => grid[d][si].map((x) => cellText(x.s, view) + (x.cont ? ' (cont.)' : '')).join('\n---\n'))]),
  };
}

const entities = (tt, view) => tt.entities[view === 'batch' ? 'batches' : view === 'faculty' ? 'faculty' : 'rooms'];
const pickEntities = (tt, view, ids) => entities(tt, view).filter((e) => !ids || ids.includes(e.id));

export function exportExcel(tt, view, ids) {
  const wb = XLSX.utils.book_new();
  pickEntities(tt, view, ids).forEach((e) => {
    const { header, rows } = matrix(tt, view, e.id);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = header.map((_, i) => ({ wch: i ? 22 : 8 }));
    XLSX.utils.book_append_sheet(wb, ws, e.name.replace(/[:\\/?*[\]]/g, '-').slice(0, 31));
  });
  XLSX.writeFile(wb, `${tt.name}-${view}-wise.xlsx`.replace(/\s+/g, '_'));
}

export function exportPdf(tt, view, ids) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pickEntities(tt, view, ids).forEach((e, i) => {
    if (i) doc.addPage();
    const { header, rows } = matrix(tt, view, e.id);
    doc.setFontSize(14); doc.text(`${VIEWS[view]}: ${e.name}`, 14, 14);
    doc.setFontSize(9); doc.setTextColor(110); doc.text(`${tt.name}  |  fitness ${Number(tt.fitness).toFixed(4)}`, 14, 19); doc.setTextColor(0);
    autoTable(doc, {
      head: [header], body: rows, startY: 24, theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle', minCellHeight: 14 },
      headStyles: { fillColor: [15, 76, 92] }, columnStyles: { 0: { cellWidth: 18, fontStyle: 'bold' } },
    });
  });
  doc.save(`${tt.name}-${view}-wise.pdf`.replace(/\s+/g, '_'));
}
