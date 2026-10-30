const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Footer, PageNumber, PageBreak
} = require('docx');

function readJson(name) {
  const fd = fs.openSync(name, 'r');
  try {
    if (!fs.fstatSync(fd).isFile() || fs.fstatSync(fd).size > 10 * 1024 * 1024) {
      throw new Error(`${name}: use um arquivo JSON de até 10 MiB.`);
    }
    return JSON.parse(fs.readFileSync(fd, 'utf-8').replace(/^\uFEFF/, ''));
  } finally {
    fs.closeSync(fd);
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const data = readJson('chapters.json');
const titles = readJson('chapter_titles.json');
const book = readJson('book.json');
if (![data, titles, book].every(isObject)) throw new Error('Os três JSONs devem conter objetos.');
if (typeof book.title !== 'string' || !book.title.trim()) throw new Error('book.title é obrigatório.');
for (const key of ['title', 'subtitle', 'genre']) {
  if (book[key] !== undefined && (typeof book[key] !== 'string' || book[key].length > 500)) {
    throw new Error(`book.${key} deve ser um texto de até 500 caracteres.`);
  }
}
const chapterKeys = Object.keys(data);
if (!chapterKeys.length || chapterKeys.length > 1000) throw new Error('Use de 1 a 1000 capítulos.');
for (const key of chapterKeys) {
  if (!/^ch[1-9]\d{0,5}$/.test(key) || typeof data[key] !== 'string') {
    throw new Error(`Capítulo inválido: ${key}. Use ch1, ch2 etc., com conteúdo textual.`);
  }
  const number = key.slice(2);
  if (!Object.hasOwn(titles, number) || typeof titles[number] !== 'string' || titles[number].length > 500) {
    throw new Error(`Título ausente ou inválido para o capítulo ${number}.`);
  }
}

const FONT = "Garamond";
const PAGE_WIDTH = 6 * 1440;
const PAGE_HEIGHT = 9 * 1440;
const TOP_MARGIN = 0.9 * 1440;
const OTHER_MARGIN = 1 * 1440;

function parseRuns(text) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.filter(p => p.length > 0).map(p => {
    if (p.startsWith('*') && p.endsWith('*') && p.length > 1) {
      return new TextRun({ text: p.slice(1, -1), font: FONT, size: 24, italics: true });
    }
    return new TextRun({ text: p, font: FONT, size: 24 });
  });
}

function isCodeLine(block) {
  const t = block.trim();
  return /^(from\s|import\s|print\(|modulo|codigo\s*=|alvo\s*=|valor\s*=|\)$|^\s{2,}\w+\s*=)/.test(t)
    || /^(Windows IP Configuration|Ethernet adapter|Host Name|Node Type|IP Routing|WINS Proxy|Description\s*\.|Physical Address|DHCP Enabled|DHCP Server|IPv?\d*\s*Address|Subnet Prefix|Default Gateway|DNS Servers)/i.test(t);
}

function codeParagraph(line) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { firstLine: 0 },
    spacing: { after: 0, before: 0, line: 220 },
    children: [ new TextRun({ text: line || " ", font: "Consolas", size: 16 }) ]
  });
}

function bodyParagraphs(text) {
  const rawBlocks = text.split('\n').filter(b => b.trim().length > 0);
  const out = [];
  let i = 0;
  while (i < rawBlocks.length) {
    if (isCodeLine(rawBlocks[i])) {
      const group = [];
      while (i < rawBlocks.length && isCodeLine(rawBlocks[i])) {
        group.push(rawBlocks[i].replace(/\s+$/, ''));
        i++;
      }
      group.forEach((line) => {
        out.push(codeParagraph(line));
      });
      continue;
    }
    out.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 0.3 * 1440 },
      spacing: { after: 120, line: 276 },
      children: parseRuns(rawBlocks[i].trim())
    }));
    i++;
  }
  return out;
}

function chapterTitle(num, title) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 100 },
      children: [ new TextRun({ text: `CAPÍTULO ${num}`, font: FONT, size: 28, bold: true }) ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [ new TextRun({ text: title, font: FONT, size: 26, italics: true }) ]
    }),
  ];
}

const titlePage = [
  new Paragraph({ text: "", spacing: { before: 2800 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [ new TextRun({ text: book.title, font: FONT, size: 44, bold: true }) ]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 400 },
    children: [ new TextRun({ text: book.subtitle || '', font: FONT, size: 36, bold: true }) ]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200 },
    children: [ new TextRun({ text: book.genre || 'um romance', font: FONT, size: 24, italics: true }) ]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200 },
    children: [ new TextRun({ text: `${chapterKeys.length} capítulo(s)`, font: FONT, size: 20 }) ]
  }),
  new Paragraph({ children: [ new PageBreak() ] }),
];

let children = [...titlePage];
const chapterNums = Object.keys(data).map(k => parseInt(k.slice(2))).sort((a,b) => a-b);
chapterNums.forEach((num, idx) => {
  children = children.concat(chapterTitle(num, titles[num]));
  children = children.concat(bodyParagraphs(data[`ch${num}`]));
  if (idx < chapterNums.length - 1) {
    children.push(new Paragraph({ children: [ new PageBreak() ] }));
  }
});

const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
        margin: { top: TOP_MARGIN, bottom: OTHER_MARGIN, left: OTHER_MARGIN, right: OTHER_MARGIN }
      }
    },
    footers: {
      default: new Footer({
        children: [ new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [ new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 }) ]
        }) ]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('Livro.docx', buf, { flag: 'wx' });
  console.log('Gerado: Livro.docx');
}).catch(error => {
  console.error(error.code === 'EEXIST'
    ? 'Livro.docx já existe. Mova ou renomeie a saída anterior antes de gerar novamente.'
    : `Falha ao gerar documento: ${error.message}`);
  process.exitCode = 1;
});
