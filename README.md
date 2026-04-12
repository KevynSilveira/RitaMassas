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

- `Node.js 24.x`
- `npm`

Nao precisa instalar:

- MySQL
- PostgreSQL
- SQLite separadamente

## Instalacao em outro computador

Esse fluxo serve para quando voce baixar o projeto do GitHub em `.zip`, descompactar e rodar.

### 1. Baixar o projeto

- baixe o projeto do GitHub em `.zip`
- descompacte em uma pasta do computador

### 2. Instalar o Node.js

- instale o `Node.js 24.x`
- depois confirme no terminal:

```bash
node -v
npm -v
```

### 3. Instalar as dependencias do projeto

Dentro da pasta do projeto, rode:

```bash
npm install
```

### 4. Iniciar o sistema

Depois rode:

```bash
npm run internal
```

Esse comando:

- gera a build web
- sobe o servidor interno na porta `3001`
- cria automaticamente a pasta `data/` se ela nao existir
- cria automaticamente o banco `data/ritamassas.db` se ele nao existir
- mostra no terminal o link local e o link da rede

## Como acessar

Na propria maquina:

```text
http://localhost:3001
```

Em outro celular ou computador na mesma rede:

- use o IP mostrado no terminal
- exemplo:

```text
http://192.168.0.104:3001
```

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
- `server/`: servidor interno e persistencia local
- `lib/`: regras de negocio, acesso a dados e utilitarios
- `assets/`: imagens e identidade visual
- `data/`: banco local e uploads gerados em execucao

## Observacoes importantes

- o projeto nao depende de banco externo
- o projeto foi preparado para uso interno em rede local
- se o navegador ou o Windows bloquear a porta `3001`, libere o acesso na rede privada
- a pasta `data/` nao deve ser enviada para o GitHub

