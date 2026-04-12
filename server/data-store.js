const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')

const SCHEMA_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    recipe TEXT,
    photo_uri TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    delivery_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    rescheduled_from TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_delivery ON orders(delivery_at);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`

const IMAGE_EXTENSIONS_BY_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

function createDataStore({ databaseFile, uploadsDir }) {
  let db = openDatabase(databaseFile)

  function openDatabase(targetFile) {
    fs.mkdirSync(path.dirname(targetFile), { recursive: true })
    const instance = new DatabaseSync(targetFile)
    instance.exec(SCHEMA_SQL)
    return instance
  }

  function closeDatabase() {
    if (!db) return
    db.close()
  }

  function reopenDatabase() {
    closeDatabase()
    db = openDatabase(databaseFile)
  }

  function runInTransaction(callback) {
    db.exec('BEGIN')
    try {
      const result = callback()
      db.exec('COMMIT')
      return result
    } catch (error) {
      try {
        db.exec('ROLLBACK')
      } catch (rollbackError) {
        console.warn('ritamassas: rollback falhou', rollbackError)
      }
      throw error
    }
  }

  function isDatabaseEmpty() {
    const row = db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM products) +
          (SELECT COUNT(*) FROM customers) +
          (SELECT COUNT(*) FROM orders) AS total`
      )
      .get()

    return Number(row?.total ?? 0) === 0
  }

  function removeDatabaseSidecars(targetFile) {
    for (const suffix of ['-shm', '-wal']) {
      try {
        fs.unlinkSync(`${targetFile}${suffix}`)
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }
  }

  function importWebDatabase(base64) {
    if (!isDatabaseEmpty()) {
      throw new Error('Database already contains data.')
    }

    const cleanBase64 = stripBase64Prefix(base64)
    if (!cleanBase64) {
      throw new Error('Nenhum dado foi enviado para importar.')
    }

    const tempFile = `${databaseFile}.importing`
    const backupFile = `${databaseFile}.backup`
    const hadOriginalFile = fs.existsSync(databaseFile)

    closeDatabase()
    removeDatabaseSidecars(databaseFile)

    try {
      fs.writeFileSync(tempFile, Buffer.from(cleanBase64, 'base64'))

      if (fs.existsSync(backupFile)) {
        fs.unlinkSync(backupFile)
      }

      if (hadOriginalFile) {
        fs.renameSync(databaseFile, backupFile)
      }

      fs.renameSync(tempFile, databaseFile)
      db = openDatabase(databaseFile)

      if (fs.existsSync(backupFile)) {
        fs.unlinkSync(backupFile)
      }
    } catch (error) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile)
        }
        if (fs.existsSync(backupFile)) {
          if (fs.existsSync(databaseFile)) {
            fs.unlinkSync(databaseFile)
          }
          fs.renameSync(backupFile, databaseFile)
        }
      } finally {
        db = openDatabase(databaseFile)
      }

      throw error
    }

    return { imported: true }
  }

  function stripBase64Prefix(value) {
    if (typeof value !== 'string') return ''
    const commaIndex = value.indexOf(',')
    if (value.startsWith('data:') && commaIndex >= 0) {
      return value.slice(commaIndex + 1)
    }
    return value
  }

  function detectImageExtension(fileName, mimeType) {
    const rawExt = path.extname(fileName || '').toLowerCase()
    if (/^\.[a-z0-9]{1,8}$/.test(rawExt)) {
      return rawExt
    }
    return IMAGE_EXTENSIONS_BY_TYPE[mimeType] ?? '.bin'
  }

  function saveUploadedImage({ base64, fileName, mimeType }) {
    if (!base64) {
      throw new Error('A imagem enviada esta vazia.')
    }

    if (mimeType && !mimeType.startsWith('image/')) {
      throw new Error('Somente imagens sao aceitas.')
    }

    fs.mkdirSync(uploadsDir, { recursive: true })

    const extension = detectImageExtension(fileName, mimeType)
    const fileId = `${Date.now()}-${crypto.randomUUID()}${extension}`
    const filePath = path.join(uploadsDir, fileId)

    fs.writeFileSync(filePath, Buffer.from(stripBase64Prefix(base64), 'base64'))
    return { photoUri: `/uploads/${encodeURIComponent(fileId)}` }
  }

  function resolveOwnedUploadPath(uri) {
    if (!uri) return null

    try {
      const parsed = new URL(uri, 'http://ritamassas.local')
      if (!parsed.pathname.startsWith('/uploads/')) return null

      const fileName = decodeURIComponent(path.basename(parsed.pathname))
      if (!fileName) return null

      const safeBaseDir = path.resolve(uploadsDir)
      const resolvedPath = path.resolve(uploadsDir, fileName)
      if (
        resolvedPath !== safeBaseDir &&
        !resolvedPath.startsWith(`${safeBaseDir}${path.sep}`)
      ) {
        return null
      }

      return resolvedPath
    } catch {
      return null
    }
  }

  function deleteOwnedUpload(uri) {
    const ownedPath = resolveOwnedUploadPath(uri)
    if (!ownedPath) return

    try {
      fs.unlinkSync(ownedPath)
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('ritamassas: falha ao remover upload antigo', error)
      }
    }
  }

  function listProducts() {
    return db
      .prepare('SELECT * FROM products ORDER BY name COLLATE NOCASE')
      .all()
  }

  function getProduct(id) {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id) ?? null
  }

  function insertProduct(row) {
    const createdAt = new Date().toISOString()
    const result = db
      .prepare(
        `INSERT INTO products (name, price, recipe, photo_uri, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        row.name,
        row.price,
        row.recipe ?? null,
        row.photo_uri ?? null,
        createdAt
      )

    return Number(result.lastInsertRowid)
  }

  function updateProduct(id, row) {
    const current = getProduct(id)
    if (!current) return

    const nextPhotoUri =
      row.photo_uri !== undefined ? row.photo_uri : current.photo_uri

    db.prepare(
      `UPDATE products
       SET name = ?, price = ?, recipe = ?, photo_uri = ?
       WHERE id = ?`
    ).run(
      row.name ?? current.name,
      row.price ?? current.price,
      row.recipe !== undefined ? row.recipe : current.recipe,
      nextPhotoUri,
      id
    )

    if (current.photo_uri && current.photo_uri !== nextPhotoUri) {
      deleteOwnedUpload(current.photo_uri)
    }
  }

  function deleteProduct(id) {
    const current = getProduct(id)
    db.prepare('DELETE FROM products WHERE id = ?').run(id)
    if (current?.photo_uri) {
      deleteOwnedUpload(current.photo_uri)
    }
  }

  function listCustomers() {
    return db
      .prepare('SELECT * FROM customers ORDER BY name COLLATE NOCASE')
      .all()
  }

  function getCustomer(id) {
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id) ?? null
  }

  function insertCustomer(row) {
    const createdAt = new Date().toISOString()
    const result = db
      .prepare(
        `INSERT INTO customers (name, phone, address, notes, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        row.name,
        row.phone ?? null,
        row.address ?? null,
        row.notes ?? null,
        createdAt
      )

    return Number(result.lastInsertRowid)
  }

  function updateCustomer(id, row) {
    const current = getCustomer(id)
    if (!current) return

    db.prepare(
      `UPDATE customers
       SET name = ?, phone = ?, address = ?, notes = ?
       WHERE id = ?`
    ).run(
      row.name ?? current.name,
      row.phone !== undefined ? row.phone : current.phone,
      row.address !== undefined ? row.address : current.address,
      row.notes !== undefined ? row.notes : current.notes,
      id
    )
  }

  function deleteCustomer(id) {
    db.prepare('DELETE FROM customers WHERE id = ?').run(id)
  }

  function insertOrder(customerId, deliveryAt, notes, items) {
    const now = new Date().toISOString()

    return runInTransaction(() => {
      const result = db
        .prepare(
          `INSERT INTO orders
             (customer_id, delivery_at, status, notes, created_at, updated_at, rescheduled_from)
           VALUES (?, ?, 'pendente', ?, ?, ?, NULL)`
        )
        .run(customerId, deliveryAt, notes ?? null, now, now)

      const orderId = Number(result.lastInsertRowid)
      const insertItem = db.prepare(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`
      )

      for (const item of items) {
        insertItem.run(orderId, item.product_id, item.quantity, item.unit_price)
      }

      return orderId
    })
  }

  function updateOrderItems(orderId, items) {
    const now = new Date().toISOString()

    runInTransaction(() => {
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(orderId)

      const insertItem = db.prepare(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`
      )

      for (const item of items) {
        insertItem.run(orderId, item.product_id, item.quantity, item.unit_price)
      }

      db.prepare('UPDATE orders SET updated_at = ? WHERE id = ?').run(now, orderId)
    })
  }

  function getOrder(id) {
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(id) ?? null
  }

  function updateOrderMeta(id, patch) {
    const current = getOrder(id)
    if (!current) return

    const now = new Date().toISOString()

    db.prepare(
      `UPDATE orders SET
        customer_id = ?,
        delivery_at = ?,
        notes = ?,
        status = ?,
        rescheduled_from = ?,
        updated_at = ?
      WHERE id = ?`
    ).run(
      patch.customer_id ?? current.customer_id,
      patch.delivery_at ?? current.delivery_at,
      patch.notes !== undefined ? patch.notes : current.notes,
      patch.status ?? current.status,
      patch.rescheduled_from !== undefined
        ? patch.rescheduled_from
        : current.rescheduled_from,
      now,
      id
    )
  }

  function rescheduleOrder(id, newDeliveryAt) {
    const current = getOrder(id)
    if (!current) return

    updateOrderMeta(id, {
      delivery_at: newDeliveryAt,
      rescheduled_from: current.delivery_at,
    })
  }

  function listOrderItems(orderId) {
    return db
      .prepare(
        'SELECT product_id, quantity, unit_price FROM order_items WHERE order_id = ?'
      )
      .all(orderId)
  }

  function hydrateOrderDetails(row) {
    const items = db
      .prepare(
        `SELECT p.name AS product_name, p.photo_uri AS photo_uri, oi.quantity, oi.unit_price
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`
      )
      .all(row.id)

    const total = items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
      0
    )

    const { customer_name: customerName, ...order } = row
    return {
      ...order,
      customer_name: customerName,
      items,
      total,
    }
  }

  function getOrderWithDetails(id) {
    const row =
      db
        .prepare(
          `SELECT o.*, c.name AS customer_name
           FROM orders o
           JOIN customers c ON c.id = o.customer_id
           WHERE o.id = ?`
        )
        .get(id) ?? null

    return row ? hydrateOrderDetails(row) : null
  }

  function listOrdersWithDetails(options = {}) {
    let sql = `SELECT o.*, c.name AS customer_name
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE 1 = 1`
    const params = []

    if (options.from) {
      sql += ' AND o.delivery_at >= ?'
      params.push(options.from)
    }

    if (options.to) {
      sql += ' AND o.delivery_at <= ?'
      params.push(options.to)
    }

    if (options.status) {
      const statuses = Array.isArray(options.status)
        ? options.status
        : [options.status]
      sql += ` AND o.status IN (${statuses.map(() => '?').join(',')})`
      params.push(...statuses)
    }

    if (options.customerId != null) {
      sql += ' AND o.customer_id = ?'
      params.push(options.customerId)
    }

    sql += ' ORDER BY o.delivery_at ASC, o.id ASC'

    return db
      .prepare(sql)
      .all(...params)
      .map((row) => hydrateOrderDetails(row))
  }

  function dashboardOrders() {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    start.setHours(0, 0, 0, 0)

    const rows = db
      .prepare(
        `SELECT o.*, c.name AS customer_name
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         WHERE o.status NOT IN ('entregue', 'cancelado')
         ORDER BY o.delivery_at ASC
         LIMIT 50`
      )
      .all()
      .map((row) => hydrateOrderDetails(row))

    return {
      upcoming: rows.filter((order) => order.delivery_at >= start.toISOString()),
      pending: rows.filter((order) => order.status === 'pendente'),
    }
  }

  function ordersForCalendarMonth(year, month) {
    const from = new Date(year, month, 1)
    const to = new Date(year, month + 1, 0, 23, 59, 59, 999)

    return listOrdersWithDetails({
      from: from.toISOString(),
      to: to.toISOString(),
    })
  }

  function productRankings(from, to) {
    let sql = `
      SELECT p.id AS product_id, p.name, SUM(oi.quantity) AS total_qty
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'cancelado'`
    const params = []

    if (from) {
      sql += ' AND o.delivery_at >= ?'
      params.push(from)
    }

    if (to) {
      sql += ' AND o.delivery_at <= ?'
      params.push(to)
    }

    sql += ' GROUP BY p.id ORDER BY total_qty DESC'
    return db.prepare(sql).all(...params)
  }

  function financialSummary(from, to) {
    const orders = db
      .prepare(
        `SELECT * FROM orders WHERE delivery_at >= ? AND delivery_at <= ?`
      )
      .all(from, to)

    let totalRevenue = 0
    let deliveredCount = 0
    let cancelledCount = 0
    const byStatus = {}

    const listItemsByOrder = db.prepare(
      'SELECT quantity, unit_price FROM order_items WHERE order_id = ?'
    )

    for (const order of orders) {
      byStatus[order.status] = (byStatus[order.status] ?? 0) + 1

      if (order.status === 'cancelado') {
        cancelledCount++
        continue
      }

      const items = listItemsByOrder.all(order.id)
      const sum = items.reduce(
        (accumulator, item) =>
          accumulator + Number(item.quantity) * Number(item.unit_price),
        0
      )

      totalRevenue += sum
      if (order.status === 'entregue') {
        deliveredCount++
      }
    }

    return {
      orderCount: orders.length,
      totalRevenue,
      deliveredCount,
      cancelledCount,
      byStatus,
    }
  }

  function customersWithOrderCount(from, to) {
    let sql = `
      SELECT c.id, c.name, COUNT(o.id) AS order_count
      FROM customers c
      INNER JOIN orders o ON o.customer_id = c.id`
    const params = []

    if (from) {
      sql += ' AND o.delivery_at >= ?'
      params.push(from)
    }

    if (to) {
      sql += ' AND o.delivery_at <= ?'
      params.push(to)
    }

    sql += ' GROUP BY c.id ORDER BY order_count DESC'
    return db.prepare(sql).all(...params)
  }

  function dispatchRpc(action, params = []) {
    switch (action) {
      case 'listProducts':
        return listProducts()
      case 'getProduct':
        return getProduct(params[0])
      case 'insertProduct':
        return insertProduct(params[0])
      case 'updateProduct':
        return updateProduct(params[0], params[1])
      case 'deleteProduct':
        return deleteProduct(params[0])
      case 'listCustomers':
        return listCustomers()
      case 'getCustomer':
        return getCustomer(params[0])
      case 'insertCustomer':
        return insertCustomer(params[0])
      case 'updateCustomer':
        return updateCustomer(params[0], params[1])
      case 'deleteCustomer':
        return deleteCustomer(params[0])
      case 'insertOrder':
        return insertOrder(params[0], params[1], params[2], params[3] ?? [])
      case 'updateOrderItems':
        return updateOrderItems(params[0], params[1] ?? [])
      case 'updateOrderMeta':
        return updateOrderMeta(params[0], params[1] ?? {})
      case 'rescheduleOrder':
        return rescheduleOrder(params[0], params[1])
      case 'getOrder':
        return getOrder(params[0])
      case 'listOrderItems':
        return listOrderItems(params[0])
      case 'getOrderWithDetails':
        return getOrderWithDetails(params[0])
      case 'listOrdersWithDetails':
        return listOrdersWithDetails(params[0] ?? {})
      case 'dashboardOrders':
        return dashboardOrders()
      case 'ordersForCalendarMonth':
        return ordersForCalendarMonth(params[0], params[1])
      case 'productRankings':
        return productRankings(params[0], params[1])
      case 'financialSummary':
        return financialSummary(params[0], params[1])
      case 'customersWithOrderCount':
        return customersWithOrderCount(params[0], params[1])
      default:
        throw new Error(`Acao RPC desconhecida: ${action}`)
    }
  }

  function resolveUploadFile(requestPath) {
    const decodedPath = decodeURIComponent(requestPath)
    const candidate = path.resolve(
      uploadsDir,
      decodedPath.replace(/^\/uploads\//, '')
    )
    const safeBaseDir = path.resolve(uploadsDir)

    if (
      candidate !== safeBaseDir &&
      !candidate.startsWith(`${safeBaseDir}${path.sep}`)
    ) {
      return null
    }

    return candidate
  }

  return {
    dispatchRpc,
    importWebDatabase,
    isDatabaseEmpty,
    resolveUploadFile,
    saveUploadedImage,
    storageInfo: {
      databaseFile,
      uploadsDir,
    },
  }
}

module.exports = {
  createDataStore,
}
