const fs = require('node:fs')
const path = require('node:path')
const QRCode = require('qrcode')

const DATA_URL_MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fileToDataUrl(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null
  }

  const extension = path.extname(filePath).toLowerCase()
  const mimeType = DATA_URL_MIME_TYPES[extension] ?? 'application/octet-stream'
  const base64 = fs.readFileSync(filePath).toString('base64')
  return `data:${mimeType};base64,${base64}`
}

function renderLinkCards(title, links) {
  if (!links.length) {
    return ''
  }

  return `
    <section class="section">
      <p class="eyebrow">${escapeHtml(title)}</p>
      <div class="link-list">
        ${links
          .map(
            (link) => `
              <a class="link-card" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">
                <span class="link-card-label">${escapeHtml(link.replace(/^https?:\/\//, ''))}</span>
                <span class="link-card-caption">Abrir</span>
              </a>
            `
          )
          .join('')}
      </div>
    </section>
  `
}

async function createLauncherHtml({
  productName,
  launcherTitle,
  localUrl,
  networkUrls,
  launcherUrl,
  logoPath,
  showQrCode = true,
}) {
  const logoDataUrl = fileToDataUrl(logoPath)
  const appTitle = launcherTitle || productName
  const phoneUrl = networkUrls[0] ?? localUrl
  const qrSvg =
    showQrCode && phoneUrl
      ? await QRCode.toString(phoneUrl, {
          type: 'svg',
          margin: 1,
          width: 220,
          color: {
            dark: '#6A3F1D',
            light: '#0000',
          },
        })
      : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(appTitle)} - Acesso</title>
    ${logoDataUrl ? `<link rel="icon" href="${logoDataUrl}" />` : ''}
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f3ef;
        --surface: #fffdfa;
        --border: #e2c9b1;
        --text: #4f2d16;
        --muted: #8f735c;
        --accent: #835427;
        --accent-soft: rgba(131, 84, 39, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", system-ui, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(226, 201, 177, 0.38), transparent 32%),
          linear-gradient(180deg, #fbf7f2 0%, var(--bg) 100%);
        color: var(--text);
      }
      main {
        max-width: 1080px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }
      .hero {
        background: rgba(255, 253, 250, 0.88);
        border: 1px solid var(--border);
        border-radius: 28px;
        padding: 28px;
        box-shadow: 0 14px 40px rgba(107, 73, 43, 0.08);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .brand img {
        width: 54px;
        height: 54px;
        object-fit: contain;
      }
      .eyebrow {
        margin: 0 0 10px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: clamp(30px, 5vw, 44px);
        line-height: 1;
      }
      .hero-subtitle {
        margin: 16px 0 0;
        max-width: 720px;
        color: var(--muted);
        font-size: 16px;
        line-height: 1.6;
      }
      .status-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 22px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        padding: 10px 16px;
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 700;
      }
      .pill::before {
        content: "";
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: #4e9c60;
      }
      .grid {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
        gap: 20px;
        margin-top: 22px;
      }
      .panel {
        background: rgba(255, 253, 250, 0.94);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 24px;
      }
      .section + .section {
        margin-top: 22px;
      }
      .link-list {
        display: grid;
        gap: 12px;
      }
      .link-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 18px;
        border-radius: 18px;
        border: 1px solid var(--border);
        background: #fff;
        color: inherit;
        text-decoration: none;
      }
      .link-card:hover {
        border-color: #c59361;
      }
      .link-card-label {
        font-weight: 700;
        word-break: break-word;
      }
      .link-card-caption {
        color: var(--accent);
        font-size: 13px;
        font-weight: 700;
      }
      .button-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .primary-button,
      .secondary-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 0 20px;
        border-radius: 16px;
        text-decoration: none;
        font-weight: 800;
      }
      .primary-button {
        background: var(--accent);
        color: #fffdfa;
      }
      .secondary-button {
        color: var(--accent);
        border: 1px solid var(--border);
        background: transparent;
      }
      .qr-shell {
        display: grid;
        place-items: center;
        min-height: 260px;
        border-radius: 22px;
        border: 1px dashed var(--border);
        background: rgba(255,255,255,0.72);
        padding: 20px;
      }
      .qr-shell svg {
        width: min(100%, 220px);
        height: auto;
      }
      .qr-caption {
        margin-top: 16px;
        text-align: center;
        color: var(--muted);
        line-height: 1.6;
      }
      .notice {
        margin-top: 16px;
        padding: 16px 18px;
        border-radius: 18px;
        border: 1px solid var(--border);
        background: rgba(255,255,255,0.7);
        color: var(--muted);
        line-height: 1.6;
      }
      code {
        font-family: "Cascadia Mono", "Consolas", monospace;
        font-size: 0.95em;
      }
      @media (max-width: 860px) {
        main { padding: 20px 16px 32px; }
        .hero { padding: 22px; border-radius: 24px; }
        .grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="brand">
          ${
            logoDataUrl
              ? `<img src="${logoDataUrl}" alt="${escapeHtml(productName)}" />`
              : ''
          }
          <div>
            <p class="eyebrow">Painel de acesso</p>
            <h1>${escapeHtml(productName)}</h1>
          </div>
        </div>

        <p class="hero-subtitle">
          Servico em execucao. Fechar esta aba nao interrompe o sistema. Para encerrar, execute o atalho do produto novamente e escolha a opcao de parar.
        </p>

        <div class="status-row">
          <span class="pill">Servidor ativo</span>
          <a class="secondary-button" href="${escapeHtml(localUrl)}" target="_blank" rel="noreferrer">Abrir sistema</a>
          <a class="secondary-button" href="${escapeHtml(launcherUrl)}" target="_blank" rel="noreferrer">Atualizar painel</a>
        </div>

        <div class="grid">
          <section class="panel">
            ${renderLinkCards('Acesso nesta maquina', [localUrl])}
            ${renderLinkCards('Acesso na rede local', networkUrls)}

            <section class="section">
              <p class="eyebrow">Uso rapido</p>
              <div class="button-row">
                <a class="primary-button" href="${escapeHtml(localUrl)}" target="_blank" rel="noreferrer">Abrir no navegador</a>
                ${
                  phoneUrl
                    ? `<a class="secondary-button" href="${escapeHtml(phoneUrl)}" target="_blank" rel="noreferrer">Abrir link da rede</a>`
                    : ''
                }
              </div>
            </section>

            <div class="notice">
              <strong>Nao feche a janela do servidor.</strong><br />
              A janela do PowerShell do servico precisa continuar aberta para manter o sistema funcionando. No celular, conecte-se na mesma rede Wi-Fi e use o QR Code ou o link da rede local.
            </div>
          </section>

          <section class="panel">
            <p class="eyebrow">Acesso pelo celular</p>
            <div class="qr-shell">
              ${qrSvg || '<p>QR Code indisponivel.</p>'}
            </div>
            <p class="qr-caption">
              Escaneie o QR Code para abrir <code>${escapeHtml(phoneUrl)}</code> no celular.
            </p>
          </section>
        </div>
      </section>
    </main>
  </body>
</html>`
}

module.exports = {
  createLauncherHtml,
}
