const fs = require('node:fs');
const path = require('node:path');

const examples = path.resolve(__dirname, '..', 'exemplo');
try {
  for (const name of ['book.json', 'chapters.json', 'chapter_titles.json']) {
    try {
      fs.copyFileSync(path.join(examples, name), path.resolve(name), fs.constants.COPYFILE_EXCL);
      console.log(`Criado: ${name}`);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      console.log(`Preservado: ${name}`);
    }
  }
  console.log('Edite os JSONs com seu livro e execute npm run build.');
} catch (error) {
  console.error(`Não foi possível preparar os arquivos: ${error.message}`);
  process.exitCode = 1;
}
