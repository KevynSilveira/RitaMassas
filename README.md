# RitaMassas

Sistema interno para operacao de pedidos, agenda de entregas, cadastro de clientes e massas/produtos.

O projeto foi pensado para rodar em uma maquina da empresa e ficar disponivel para outros dispositivos na mesma rede, mantendo os dados salvos localmente mesmo depois de reiniciar o sistema.

## Objetivo do projeto

- cadastrar clientes
- cadastrar massas e produtos
- criar e acompanhar pedidos
- organizar entregas em agenda
- gerar relatorios
- manter tudo salvo em banco local, sem depender de servico externo

## Tecnologias usadas

- `TypeScript`
- `Expo`
- `React Native Web`
- `Expo Router`
- `Node.js`
- `SQLite local` com `node:sqlite`
- `date-fns`

## Como o sistema funciona

- a interface web e gerada localmente
- um servidor interno em Node.js entrega a interface e a API
- os dados ficam em um arquivo SQLite dentro da pasta `data/`
- as imagens enviadas pelo sistema ficam em `data/uploads/`

## Requisitos

Para instalar e rodar em outro computador, voce precisa apenas de:

- Windows
- internet na primeira execucao
- permissao para instalar programas, caso o `Node.js` ainda nao esteja instalado

Nao precisa instalar:

- MySQL
- PostgreSQL
- SQLite separadamente

## Instalacao em outro computador

Agora o projeto possui um launcher para Windows que automatiza a configuracao inicial.

Esse fluxo serve para quando voce baixar o projeto do GitHub em `.zip`, descompactar e rodar.

### 1. Baixar o projeto

- baixe o projeto do GitHub em `.zip`
- descompacte em uma pasta do computador

### 2. Executar o launcher

- clique em `RitaMassas.bat`
- ou crie um atalho dele na area de trabalho

Na primeira execucao, ele faz automaticamente:

- verifica `Node.js` e `npm`
- instala o `Node.js 24.x` se precisar
- roda `npm install` quando necessario
- gera a build web
- cria as pastas `data/` e `data/uploads/`
- sobe o servidor interno
- abre o navegador com um painel de acesso
- cria um atalho na area de trabalho com o icone do produto

## Como acessar

Na propria maquina, o launcher abre:

```text
http://localhost:3001/launcher
```

Nesse painel voce encontra:

- status do servico
- botao para abrir o sistema
- link local
- link da rede
- QR Code para abrir no celular

O sistema em si continua em:

```text
http://localhost:3001
```

Em outro celular ou computador na mesma rede:

- use o IP mostrado no terminal
- exemplo:

```text
http://192.168.0.104:3001
```

## Como parar o sistema

- execute `RitaMassas.bat` novamente
- se o servico ja estiver rodando, o launcher abre um menu com opcoes
- escolha `Parar servico`

O launcher tambem permite:

- abrir o painel de acesso
- abrir o sistema
- copiar o link da rede
- reiniciar o servico

## Onde os dados ficam

- banco local: `data/ritamassas.db`
- imagens: `data/uploads/`

Os dados continuam salvos no disco mesmo que o processo seja encerrado.

## Como levar os dados para outro computador

Se voce quiser trocar de maquina sem perder os dados:

1. instale o projeto na nova maquina
2. feche o sistema
3. copie a pasta `data/` da maquina antiga
4. cole dentro da pasta do projeto na maquina nova
5. inicie novamente com `npm run internal`

## Desenvolvimento

Para desenvolvimento com atualizacao da interface:

```bash
npm run serve:internal
npm run web
```

Nesse modo:

- a API local roda na porta `3001`
- a interface de desenvolvimento roda na porta `8081`

## Estrutura principal do projeto

- `app/`: telas e rotas
- `components/`: componentes visuais e de layout
- `config/`: configuracao local do launcher e do acesso
- `server/`: servidor interno e persistencia local
- `lib/`: regras de negocio, acesso a dados e utilitarios
- `scripts/windows/`: launcher, host do servidor e automacao para Windows
- `assets/`: imagens e identidade visual
- `data/`: banco local e uploads gerados em execucao

## Observacoes importantes

- o projeto nao depende de banco externo
- o projeto foi preparado para uso interno em rede local
- se o navegador ou o Windows bloquear a porta `3001`, libere o acesso na rede privada
- a pasta `data/` nao deve ser enviada para o GitHub
- o arquivo principal para uso rapido e `RitaMassas.bat`
