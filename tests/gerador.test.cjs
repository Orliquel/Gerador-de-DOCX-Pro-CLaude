const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
function workspace(t) {
  const parent = path.resolve(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(parent, 'docx-test-'));
  t.after(() => {
    assert.equal(path.dirname(directory), parent);
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return directory;
}
function run(script, cwd) {
  return spawnSync(process.execPath, [path.join(root, script)], {
    cwd, encoding: 'utf8', timeout: 30000,
  });
}

test('prepara exemplos sem sobrescrever o texto do usuário', t => {
  const dir = workspace(t);
  fs.writeFileSync(path.join(dir, 'chapters.json'), '{"ch1":"Meu texto privado fictício"}');
  const before = fs.readFileSync(path.join(dir, 'chapters.json'));
  assert.equal(run('scripts/preparar.cjs', dir).status, 0);
  assert.deepEqual(fs.readFileSync(path.join(dir, 'chapters.json')), before);
  for (const name of ['book.json', 'chapter_titles.json']) {
    assert.deepEqual(fs.readFileSync(path.join(dir, name)), fs.readFileSync(path.join(root, 'exemplo', name)));
  }
  assert.equal(run('scripts/preparar.cjs', dir).status, 0);
  assert.deepEqual(fs.readFileSync(path.join(dir, 'chapters.json')), before);
});

test('gera o exemplo e preserva um DOCX já existente', t => {
  const dir = workspace(t);
  assert.equal(run('scripts/preparar.cjs', dir).status, 0);
  const first = run('build_docx.js', dir);
  assert.equal(first.status, 0, first.stderr);
  const output = path.join(dir, 'Livro.docx');
  const before = fs.readFileSync(output);
  assert.equal(before.subarray(0, 4).toString('hex'), '504b0304');
  assert.notEqual(run('build_docx.js', dir).status, 0);
  assert.deepEqual(fs.readFileSync(output), before);
});

test('rejeita capítulo inválido sem criar documento', t => {
  const dir = workspace(t);
  assert.equal(run('scripts/preparar.cjs', dir).status, 0);
  fs.writeFileSync(path.join(dir, 'chapters.json'), '{"../fora":"texto"}');
  assert.notEqual(run('build_docx.js', dir).status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'Livro.docx')), false);
});
