"""Empacota somente os arquivos públicos explicitamente listados."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parent.parent
FILES = (
    '.gitignore', 'README.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md',
    'build_docx.js', 'package.json', 'package-lock.json',
    'exemplo/book.json', 'exemplo/chapters.json', 'exemplo/chapter_titles.json',
    'scripts/preparar.cjs', 'scripts/package_release.py', 'tests/gerador.test.cjs',
)


def main():
    version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
    if not isinstance(version, str) or not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Versão inválida no package.json')
    dist = ROOT / 'dist'
    dist.mkdir(exist_ok=True)
    archive = dist / f'gerador-de-docx-pro-claude-v{version}.zip'
    folder = f'gerador-de-docx-pro-claude-v{version}'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as output:
        for name in FILES:
            source = ROOT / name
            if source.is_symlink() or not source.is_file() or not source.resolve().is_relative_to(ROOT):
                raise ValueError(f'Arquivo de distribuição inválido: {name}')
            output.write(source, f'{folder}/{name}')
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (dist / 'SHA256SUMS.txt').write_text(f'{digest}  {archive.name}\n', encoding='utf-8')
    print(archive.name)


if __name__ == '__main__':
    main()
