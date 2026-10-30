# Como contribuir

Abra uma issue descrevendo o comportamento esperado, o ocorrido e a versão do Node.js e do sistema operacional. Use exemplos fictícios e pequenos. Não publique seu manuscrito, dados pessoais, tokens, cookies ou arquivos do perfil do Claude.

Para desenvolver:

```sh
npm ci --ignore-scripts
npm test
```

Preserve a formatação existente, a validação dos JSONs e a proteção contra sobrescrita. Inclua um teste de comportamento quando a alteração afetar esses contratos. Atualize o README se mudar comandos ou entradas.

O pacote de distribuição usa uma lista explícita em `scripts/package_release.py`. Ao incluir um arquivo necessário para executar o gerador, atualize essa lista e confira o ZIP. Nunca empacote `node_modules`, credenciais ou entradas privadas.

Ao relatar uma vulnerabilidade, não inclua segredos reais em issues públicas. Para exposição acidental de uma credencial sua, revogue-a no serviço de origem; apagar o texto de um comentário não revoga a credencial.
