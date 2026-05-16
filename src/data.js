// Data derived from USAMA NASEER COMPANIES.xlsx
export const companiesData = [
    { id: "c1", name: "PARAGON OVERSEAS ECUCATION PRIVATE LTD", type: "PVT", directors: ["USAMA NASEER", "ATIF ASLAM"] },
    { id: "c2", name: "PARAGON OVERSEAS EDUCATION (PVT) LIMITED STAFF PROVIDENT FUND", type: "PVT", directors: [] },
    { id: "c3", name: "PARAGON GLOBAL SERVICES PVT LTD", type: "PVT", directors: ["USAMA NASEER", "ATIF ASLAM", "ANAS ABDULLAH", "SADDAM HUSSAIN", "MUHAMMAD AMOAZ AKRAM"] },
    { id: "c4", name: "JAADA SCHOOL PRIVATE LIMITED", type: "PVT", directors: ["USAMA NASEER", "ROMESA MAIAM", "SADDAM HUSSAIN", "MUHAMMAD AMOAZ AKRAM"] },
    { id: "c5", name: "PROSUME SOLAR ENERGY (PVT) LTD", type: "PVT", directors: ["USAMA NASEER", "MUHAMMAD KHUBAIB"] },
    { id: "c6", name: "DEV MONDIALE PVT LTD", type: "PVT", directors: ["USAMA NASEER", "MASHOOD NOMAN", "ARSLAN AHMAD"] },
    { id: "c7", name: "JAADA EDUCATIONAL SERVICES (FOUNDATION)", type: "PVT", directors: ["ANAS ABDULLAH", "ROMESA MAIAM", "HAMNA AHMAD"] },
    // AOP group
    { id: "c8", name: "JAADA EDUCATIONAL SERVICES", type: "AOP", directors: ["USAMA NASEER", "NASEER AHMED", "MIAN IZHAR UL HAQ"] },
    { id: "c9", name: "JAADA EDUCATIONAL NETWORK", type: "AOP", directors: ["USAMA NASEER", "ATIF ASLAM", "SADDAM HUSSAIN", "MUHAMMAD AMOAZ AKRAM"] },
    { id: "c10", name: "ARQAM BROTHERS EDUCATIONAL SERVICES", type: "AOP", directors: ["NASEER AHMED", "SHAMSHAD AHMED", "IRFAN AHMED"] },
    { id: "c11", name: "ARQAM BROTHERS EDUCATIONAL NETWORKS", type: "AOP", directors: ["NASEER AHMED", "IRFAN AHMED", "MIAN IZHAR UL HAQ", "RIZWAN AHMED"] },
    { id: "c12", name: "MUKABBIR EDUCATION NETWORK", type: "AOP", directors: ["USAMA NASEER", "NASEER AHMED", "MIAN IZHAR UL HAQ", "RIZWAN AHMED"] },
    { id: "c13", name: "MUKABBIR EDUCATION SERVICES", type: "AOP", directors: ["NASEER AHMED", "IRFAN AHMED", "MIAN IZHAR UL HAQ", "SHAMSHAD AHMED", "IFTIKHAR AHMAD"] },
    { id: "c14", name: "ARQAM EDUCATIONAL SOLUTIONS", type: "AOP", directors: ["HASSAN MUHAMMAD", "AHMAD SAJJAD"] },
    { id: "c15", name: "AMI SOLUTIONS", type: "AOP", directors: ["MADIHA BASHARAT", "AISHA KHALID", "IRAM SHAHZADI"] },
    { id: "c16", name: "M & I MARKETING", type: "AOP", directors: ["MADIHA BASHARAT", "IRAM SHAHZADI"] },
    { id: "c17", name: "MS DIGITALS", type: "AOP", directors: ["SADDAM HUSSAIN", "MUHAMMAD AMOAZ AKRAM"] },
    { id: "c18", name: "A & S TRADERS", type: "AOP", directors: ["MUHAMMAD ASLAM", "SAKINA BIBI"] },
    // IND Soleprop
    { id: "c19", name: "PARAGON OVERSEAS EDUCATION (IND)", type: "IND", directors: ["USAMA NASEER"] }
];

// Build unique persons set and map person -> companies
export const personToCompanies = new Map();
export const allPersonsSet = new Set();
companiesData.forEach(comp => {
    comp.directors.forEach(person => {
        allPersonsSet.add(person);
        if (!personToCompanies.has(person)) personToCompanies.set(person, []);
        personToCompanies.get(person).push(comp.name);
    });
});
export const personList = Array.from(allPersonsSet).sort();

// Node and link generation for graph
export const companyNodes = companiesData.map(comp => ({ id: comp.id, name: comp.name, type: 'company', compType: comp.type, directors: comp.directors }));
export const personNodes = personList.map(p => ({ id: `p_${p.replace(/\s/g, '')}`, name: p, type: 'person', companies: personToCompanies.get(p) || [] }));

export const graphNodes = [...companyNodes, ...personNodes];

// Links: company <-> person
export const links = [];
companiesData.forEach(comp => {
    comp.directors.forEach(person => {
        const personNode = personNodes.find(p => p.name === person);
        if (personNode) {
            links.push({ source: comp.id, target: personNode.id, sourceType: 'company', targetType: 'person' });
        }
    });
});

// Mapping for quick lookup
export const nodeMap = new Map();
graphNodes.forEach(node => nodeMap.set(node.id, node));

// Color mapping for company types
export const compColor = {
    'PVT': 0x3a86ff,   // vivid blue
    'AOP': 0x38b000,   // bright green
    'IND': 0xf4a261    // orange
};
export const personColor = 0xff69b4; // hot pink / coral