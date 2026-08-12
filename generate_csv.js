import fs from 'fs';
import { createDefaultDatabase } from './src/data.js';

const db = createDefaultDatabase();
const now = new Date().toISOString();

// Helper to escape CSV fields
function escapeCsv(str) {
    if (str === null || str === undefined) return '""';
    const stringified = String(str);
    return `"${stringified.replace(/"/g, '""')}"`;
}

// Helper to format Postgres array for CSV
function formatPgArray(arr) {
    if (!arr || arr.length === 0) return '"{}"';
    // Inside the postgres array literal, strings are quoted with double quotes.
    // In CSV, those double quotes must be doubled.
    // Example: {"A","B"} -> "{""A"",""B""}"
    const inner = arr.map(item => `""${String(item).replace(/"/g, '""""')}""`).join(',');
    return `"{${inner}}"`;
}

// 1. Generate groups.csv
const groupsHeader = 'id,label,description,created_at\n';
const groupsCsv = groupsHeader + db.groups.map(g => 
    `${escapeCsv(g.id)},${escapeCsv(g.label)},${escapeCsv(g.description)},${now}`
).join('\n');
fs.writeFileSync('groups.csv', groupsCsv);

// 2. Generate companies.csv
const compHeader = 'id,group_id,name,type,directors,created_at\n';
const compCsv = compHeader + db.groups.flatMap(g => 
    g.companies.map(c => 
        `${escapeCsv(c.id)},${escapeCsv(g.id)},${escapeCsv(c.name)},${escapeCsv(c.type)},${formatPgArray(c.directors)},${now}`
    )
).join('\n');
fs.writeFileSync('companies.csv', compCsv);

// 3. Generate users.csv
const usersHeader = 'id,name,email,role,allowed_group_ids,active,created_at\n';
const usersCsv = usersHeader + db.users.map(u => 
    `${escapeCsv(u.id)},${escapeCsv(u.name)},${escapeCsv(u.email)},${escapeCsv(u.role)},${formatPgArray(u.allowedGroupIds)},${u.active},${now}`
).join('\n');
fs.writeFileSync('users.csv', usersCsv);

console.log("Successfully generated groups.csv, companies.csv, and users.csv");
