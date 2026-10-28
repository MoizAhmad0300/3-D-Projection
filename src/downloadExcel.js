import * as XLSX from 'xlsx';

/**
 * Generates a professional, branded XLSX file for a group's company data.
 *
 * @param {object} group        - { id, label, companies: [{name, type, directors}] }
 * @param {object} columns      - { name: bool, type: bool, groupName: bool, directors: bool }
 */
export function downloadGroupAsExcel(group, columns) {
  if (!group || !group.companies.length) return;

  // ── 1. Build header row ──────────────────────────────────────────────────
  const headers = [];
  if (columns.name)      headers.push('Company Name');
  if (columns.type)      headers.push('Company Type');
  if (columns.groupName) headers.push('Group');
  if (columns.directors) headers.push('Directors');

  if (headers.length === 0) return;

  // ── 2. Build data rows ───────────────────────────────────────────────────
  const dataRows = group.companies.map((c, idx) => {
    const row = [];
    if (columns.name)      row.push(c.name);
    if (columns.type)      row.push(c.type);
    if (columns.groupName) row.push(group.label);
    if (columns.directors) row.push(c.directors.join(', ') || '—');
    return row;
  });

  // ── 3. Build sheet from array of arrays (gives us cell address control) ─
  const sheetData = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const totalCols = headers.length;
  const totalRows = dataRows.length;

  // ── 4. Column widths (auto-size based on content) ─────────────────────
  const colWidths = headers.map((h, ci) => {
    let max = h.length;
    dataRows.forEach(row => {
      const val = String(row[ci] || '');
      if (val.length > max) max = val.length;
    });
    return { wch: Math.min(max + 4, 60) }; // cap at 60 chars
  });
  ws['!cols'] = colWidths;

  // ── 5. Freeze top row ─────────────────────────────────────────────────
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };

  // ── 6. Styles ─────────────────────────────────────────────────────────
  const PRIMARY   = '5F2057'; // brand purple-maroon
  const ALT_ROW   = 'F5EEF8'; // very light lavender for alternating rows
  const WHITE     = 'FFFFFF';
  const DARK_TEXT = '1A0A18';
  const MUTED     = '7D6B7A';

  const headerFont  = { bold: true, color: { rgb: WHITE }, name: 'Calibri', sz: 11 };
  const headerFill  = { fgColor: { rgb: PRIMARY }, patternType: 'solid' };
  const headerAlign = { horizontal: 'center', vertical: 'center', wrapText: false };
  const headerBorder = {
    top:    { style: 'thin', color: { rgb: PRIMARY } },
    bottom: { style: 'medium', color: { rgb: PRIMARY } },
    left:   { style: 'thin', color: { rgb: PRIMARY } },
    right:  { style: 'thin', color: { rgb: PRIMARY } },
  };

  // Apply header styles (row 1)
  for (let ci = 0; ci < totalCols; ci++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (!ws[addr]) ws[addr] = { v: headers[ci], t: 's' };
    ws[addr].s = {
      font: headerFont,
      fill: headerFill,
      alignment: headerAlign,
      border: headerBorder,
    };
  }

  // Apply data row styles
  for (let ri = 0; ri < totalRows; ri++) {
    const isAlt = ri % 2 === 1;
    const rowFill = { fgColor: { rgb: isAlt ? ALT_ROW : WHITE }, patternType: 'solid' };
    const cellBorder = {
      top:    { style: 'hair', color: { rgb: 'D5C8D3' } },
      bottom: { style: 'hair', color: { rgb: 'D5C8D3' } },
      left:   { style: 'thin', color: { rgb: 'D5C8D3' } },
      right:  { style: 'thin', color: { rgb: 'D5C8D3' } },
    };

    for (let ci = 0; ci < totalCols; ci++) {
      const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
      if (!ws[addr]) ws[addr] = { v: dataRows[ri][ci] ?? '', t: 's' };

      // Type column: center-align
      const isTypeCol = columns.type && (columns.name ? ci === 1 : ci === 0);
      ws[addr].s = {
        font: { name: 'Calibri', sz: 10, color: { rgb: DARK_TEXT } },
        fill: rowFill,
        alignment: {
          horizontal: isTypeCol ? 'center' : 'left',
          vertical: 'center',
          wrapText: ci === totalCols - 1 && columns.directors, // wrap Directors col
        },
        border: cellBorder,
      };
    }
  }

  // ── 7. Row heights ────────────────────────────────────────────────────
  ws['!rows'] = [
    { hpt: 22 }, // header
    ...Array(totalRows).fill({ hpt: 18 }),
  ];

  // ── 8. Sheet range ────────────────────────────────────────────────────
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRows, c: totalCols - 1 } });

  // ── 9. Workbook metadata ──────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title:    `${group.label} — Company Data`,
    Subject:  'Corporate Group Directory',
    Author:   'NAAR Barristers & Advocates',
    Company:  'NAAR',
    CreatedDate: new Date(),
  };

  const safeSheetName = group.label.replace(/[\\/*?[\]]/g, '').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const fileName = `${group.label.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
