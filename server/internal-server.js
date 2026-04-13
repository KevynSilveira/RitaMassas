const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')

const { createDataStore } = require('./data-store')
const { createLauncherHtml } = require('./launcher-panel')

const ROOT_DIR = path.resolve(__dirname, '..')
const LOCAL_SETUP_PATH = path.join(ROOT_DIR, 'config', 'local-setup.json')
const LOCAL_SETUP_DEFAULTS = {
  productName: 'Rita Massas',
  launcherTitle: 'Rita Massas',
  port: 3001,
  launcherPath: '/launcher',
  logoPath: 'assets/images/brand-chef-hat.png',
  showQrCode: true,
}

function readLocalSetup() {
  if (!fs.existsSync(LOCAL_SETUP_PATH)) {
    return { ...LOCAL_SETUP_DEFAULTS }
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(LOCAL_SETUP_PATH, 'utf-8'))
    return {
      ...LOCAL_SETUP_DEFAULTS,
      ...parsed,
    }
  } catch (error) {
    console.warn('ritamassas: falha ao ler config/local-setup.json', error)
    return { ...LOCAL_SETUP_DEFAULTS }
  }
}

const localSetup = readLocalSetup()
const HOST = process.env.HOST || '0.0.0.0'
const PORT = Number(process.env.PORT || localSetup.port || 3001)
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT_DIR, 'data')
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
const DATABASE_FILE = process.env.DATABASE_FILE
  ? path.resolve(process.env.DATABASE_FILE)
  : path.join(DATA_DIR, 'ritamassas.db')

function resolveBuildDirectory() {
  if (process.env.BUILD_DIR) {
    return path.resolve(process.env.BUILD_DIR)
  }
  const distDir = path.join(ROOT_DIR, 'dist')
  if (fs.existsSync(distDir)) return distDir
  return path.join(ROOT_DIR, 'dist-web')
}

const DIST_DIR = resolveBuildDirectory()

const store = createDataStore({
  databaseFile: DATABASE_FILE,
  uploadsDir: UPLOADS_DIR,
})

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function sendJson(req, res, statusCode, payload) {
  setCorsHeaders(req, res)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(payload))
}

function sendText(req, res, statusCode, message) {
  setCorsHeaders(req, res)
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  })
  res.end(message)
}

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

function safeResolve(baseDir, candidatePath) {
  const resolved = path.resolve(baseDir, candidatePath)
  const safeBase = path.resolve(baseDir)

  if (resolved !== safeBase && !resolved.startsWith(`${safeBase}${path.sep}`)) {
    return null
  }

  return resolved
}

function serveFile(req, res, filePath) {
  const stream = fs.createReadStream(filePath)
  stream.on('error', (error) => {
    console.error(error)
    sendText(req, res, 500, 'Falha ao ler o arquivo solicitado.')
  })

  setCorsHeaders(req, res)
  res.writeHead(200, {
    'Content-Type': getMimeType(filePath),
  })
  stream.pipe(res)
}

async function readJsonBody(req) {
  let size = 0
  const chunks = []

  for await (const chunk of req) {
    size += chunk.length
    if (size > 20 * 1024 * 1024) {
      throw new Error('Payload maior do que o limite aceito.')
    }
    chunks.push(chunk)
  }

  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
}

function resolveStaticAsset(requestPath) {
  if (!fs.existsSync(DIST_DIR)) return null

  const normalized = requestPath === '/' ? '/index.html' : requestPath
  const candidates = []

  if (normalized.endsWith('/')) {
    candidates.push(`${normalized}index.html`)
  } else {
    candidates.push(normalized)
    if (!path.extname(normalized)) {
      candidates.push(`${normalized}.html`)
      candidates.push(`${normalized}/index.html`)
    }
  }

  for (const candidate of candidates) {
    const resolved = safeResolve(DIST_DIR, candidate.replace(/^[/\\]+/, ''))
    if (!resolved) continue
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      return resolved
    }
  }

  const fallback = path.join(DIST_DIR, 'index.html')
  return fs.existsSync(fallback) ? fallback : null
}

function getServerUrls() {
  const urls = [`http://localhost:${PORT}`]
  const virtualMacPattern = /^(?:0a:00:27|08:00:27|00:05:69|00:0c:29|00:1c:14|00:50:56|00:15:5d)/i

  for (const [interfaceName, addresses] of Object.entries(os.networkInterfaces())) {
    if (/virtual|vmware|vethernet|hyper-v|host-only|loopback/i.test(interfaceName)) {
      continue
    }

    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue
      if (address.mac && virtualMacPattern.test(address.mac)) continue
      urls.push(`http://${address.address}:${PORT}`)
    }
  }

  return Array.from(new Set(urls))
}

function getLauncherInfo() {
  const urls = getServerUrls()
  const localUrl = urls.find((url) => url.includes('localhost')) ?? `http://localhost:${PORT}`
  const networkUrls = urls.filter((url) => !url.includes('localhost'))

  return {
    productName: localSetup.productName,
    launcherTitle: localSetup.launcherTitle,
    localUrl,
    networkUrls,
    launcherUrl: `${localUrl}${localSetup.launcherPath}`,
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendText(req, res, 400, 'Requisicao invalida.')
    return
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(requestUrl.pathname)

  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res)
    res.writeHead(204)
    res.end()
    return
  }

  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(req, res, 200, { ok: true })
      return
    }

    if (pathname === '/api/launcher-info' && req.method === 'GET') {
      sendJson(req, res, 200, getLauncherInfo())
      return
    }

    if (pathname === '/api/bootstrap' && req.method === 'GET') {
      sendJson(req, res, 200, {
        empty: store.isDatabaseEmpty(),
        storage: store.storageInfo,
      })
      return
    }

    if (pathname === '/api/import-web-db' && req.method === 'POST') {
      const body = await readJsonBody(req)
      const result = store.importWebDatabase(body.base64)
      sendJson(req, res, 200, result)
      return
    }

    if (pathname === '/api/upload-image' && req.method === 'POST') {
      const body = await readJsonBody(req)
      const result = store.saveUploadedImage(body)
      sendJson(req, res, 200, result)
      return
    }

    if (pathname === '/api/rpc' && req.method === 'POST') {
      const body = await readJsonBody(req)
      const result = store.dispatchRpc(body.action, body.params)
      sendJson(req, res, 200, { result })
      return
    }

    if (pathname.startsWith('/uploads/')) {
      const filePath = store.resolveUploadFile(pathname)
      if (!filePath || !fs.existsSync(filePath)) {
        sendText(req, res, 404, 'Arquivo nao encontrado.')
        return
      }

      serveFile(req, res, filePath)
      return
    }

    if (pathname === localSetup.launcherPath && req.method === 'GET') {
      const launcherInfo = getLauncherInfo()
      const html = await createLauncherHtml({
        productName: localSetup.productName,
        launcherTitle: localSetup.launcherTitle,
        localUrl: launcherInfo.localUrl,
        networkUrls: launcherInfo.networkUrls,
        launcherUrl: launcherInfo.launcherUrl,
        logoPath: path.join(ROOT_DIR, localSetup.logoPath),
        showQrCode: localSetup.showQrCode,
      })

      setCorsHeaders(req, res)
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
      })
      res.end(html)
      return
    }

    const staticAsset = resolveStaticAsset(pathname)
    if (staticAsset) {
      serveFile(req, res, staticAsset)
      return
    }

    sendText(req, res, 404, 'Rota nao encontrada.')
  } catch (error) {
    console.error(error)
    sendJson(req, res, 500, {
      error: error instanceof Error ? error.message : 'Erro interno do servidor.',
    })
  }
})

server.listen(PORT, HOST, () => {
  const urls = getServerUrls()
  console.log('Servidor interno RitaMassas ativo.')
  console.log(`Banco de dados: ${DATABASE_FILE}`)
  console.log(`Uploads: ${UPLOADS_DIR}`)
  for (const url of urls) {
    console.log(`Acesse: ${url}`)
  }
  if (!fs.existsSync(DIST_DIR)) {
    console.log('dist-web nao encontrado. Rode "npm run build:web" antes de servir a interface web.')
  }
})
