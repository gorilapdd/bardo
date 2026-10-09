
const STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'cancelled'
]

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
}

const DELIVERY_COST = 30

export function registerOrderRoutes({ app, adminRouter, q, bad }) {
  const W = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next)

  /*
   * Valida los datos del cliente.
   */
  const validateCustomer = body => {
    const customerName = String(
      body?.customer_name || ''
    ).trim()

    const customerPhone = String(
      body?.customer_phone || ''
    ).trim()

    const phoneDigits = customerPhone.replace(/\D/g, '')

    if (
      customerName.length < 2 ||
      customerName.length > 100
    ) {
      throw bad('Ingresá un nombre válido.')
    }

    if (
      phoneDigits.length < 7 ||
      phoneDigits.length > 15
    ) {
      throw bad('Ingresá un teléfono válido.')
    }

    return {
      customerName,
      customerPhone,
      phoneDigits
    }
  }

  /*
   * Crea un pedido usando los precios de la base de datos.
   */
  app.post(
    '/api/orders',
    W(async (req, res) => {
      const {
        customerName,
        customerPhone
      } = validateCustomer(req.body)

      const delivery = req.body?.delivery === true
      const notes = String(req.body?.notes || '').trim()

      if (notes.length > 1000) {
        throw bad(
          'Las notas no pueden superar los 1000 caracteres.'
        )
      }

      const submittedItems = req.body?.items

      if (
        !Array.isArray(submittedItems) ||
        submittedItems.length === 0 ||
        submittedItems.length > 50
      ) {
        throw bad(
          'El carrito está vacío o contiene demasiados productos.'
        )
      }

      const snapshot = []
      let subtotal = 0

      for (const submitted of submittedItems) {
        const productId = Number(submitted?.id)
        const quantity = Number(submitted?.qty)

        if (
          !Number.isInteger(productId) ||
          productId <= 0 ||
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > 50
        ) {
          throw bad(
            'Hay un producto o una cantidad inválida.'
          )
        }

        const [product] = await q(
          `SELECT
             p.id,
             p.name,
             p.description,
             p.price,
             p.image_url,
             p.available,
             p.product_type
           FROM products p
           JOIN categories c
             ON c.id = p.category_id
           WHERE p.id = $1
             AND c.active = TRUE`,
          [productId]
        )

        if (!product || !product.available) {
          throw bad(
            'Uno de los productos ya no está disponible. Actualizá el catálogo.',
            409
          )
        }

        const unitPrice = Number(product.price)

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw bad(
            'El precio de un producto no es válido.',
            500
          )
        }

        let packSelections = []

        if (product.product_type === 'pack') {
          const options = await q(
            `SELECT
               po.id,
               po.name,
               po.category_id,
               po.quantity,
               po.required
             FROM pack_options po
             JOIN categories c
               ON c.id = po.category_id
             WHERE po.product_id = $1
               AND c.active = TRUE
             ORDER BY po.sort_order, po.id`,
            [product.id]
          )

          const suppliedOptions = Array.isArray(
            submitted.packSelections
          )
            ? submitted.packSelections
            : []

          if (suppliedOptions.length !== options.length) {
            throw bad(
              `Revisá las opciones del pack "${product.name}".`
            )
          }

          for (const option of options) {
            const selectedOption = suppliedOptions.find(
              entry =>
                Number(entry?.optionId) === Number(option.id)
            )

            if (!selectedOption) {
              throw bad(
                `Falta elegir la opción "${option.name}" del pack "${product.name}".`
              )
            }

            const selections = Array.isArray(
              selectedOption.selections
            )
              ? selectedOption.selections
              : []

            const cleanSelections = []
            let selectedCount = 0
            const seenProductIds = new Set()

            for (const selection of selections) {
              const selectedProductId = Number(selection?.id)
              const selectedQuantity = Number(
                selection?.quantity
              )

              if (
                !Number.isInteger(selectedProductId) ||
                selectedProductId <= 0 ||
                !Number.isInteger(selectedQuantity) ||
                selectedQuantity <= 0 ||
                seenProductIds.has(selectedProductId)
              ) {
                throw bad(
                  `Hay una selección inválida en "${option.name}".`
                )
              }

              seenProductIds.add(selectedProductId)
              selectedCount += selectedQuantity

              const [selectedProduct] = await q(
                `SELECT
                   p.id,
                   p.name,
                   p.available
                 FROM products p
                 JOIN categories c
                   ON c.id = p.category_id
                 WHERE p.id = $1
                   AND p.category_id = $2
                   AND p.available = TRUE
                   AND c.active = TRUE`,
                [
                  selectedProductId,
                  option.category_id
                ]
              )

              if (!selectedProduct) {
                throw bad(
                  `Un producto elegido en "${option.name}" ya no está disponible.`
                )
              }

              cleanSelections.push({
                id: selectedProduct.id,
                name: selectedProduct.name,
                quantity: selectedQuantity
              })
            }

            const requiredQuantity = Number(option.quantity)

            if (
              option.required &&
              selectedCount !== requiredQuantity
            ) {
              throw bad(
                `Elegí ${requiredQuantity} producto(s) en "${option.name}".`
              )
            }

            if (
              !option.required &&
              selectedCount !== 0 &&
              selectedCount !== requiredQuantity
            ) {
              throw bad(
                `La opción "${option.name}" debe tener ${requiredQuantity} selección(es) o quedar vacía.`
              )
            }

            packSelections.push({
              optionId: option.id,
              optionName: option.name,
              quantity: requiredQuantity,
              selections: cleanSelections
            })
          }
        } else if (
          submitted.packSelections?.length
        ) {
          throw bad(
            `El producto "${product.name}" no admite opciones de pack.`
          )
        }

        const lineTotal = Math.round(
          unitPrice * quantity * 100
        ) / 100

        subtotal += lineTotal

        snapshot.push({
          id: product.id,
          name: product.name,
          description: product.description || '',
          image_url: product.image_url || null,
          product_type: product.product_type,
          unit_price: unitPrice,
          quantity,
          line_total: lineTotal,
          packSelections
        })
      }

      subtotal = Math.round(subtotal * 100) / 100

      const deliveryCost = delivery
        ? DELIVERY_COST
        : 0

      const total = Math.round(
        (subtotal + deliveryCost) * 100
      ) / 100

      const [order] = await q(
        `INSERT INTO orders (
           customer_name,
           customer_phone,
           delivery,
           notes,
           status,
           subtotal,
           delivery_cost,
           total,
           items
         )
         VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8::jsonb)
         RETURNING
           id,
           customer_name,
           customer_phone,
           delivery,
           notes,
           status,
           subtotal,
           delivery_cost,
           total,
           items,
           created_at,
           updated_at`,
        [
          customerName,
          customerPhone,
          delivery,
          notes,
          subtotal,
          deliveryCost,
          total,
          JSON.stringify(snapshot)
        ]
      )

      res.status(201).json({
        ok: true,
        order
      })
    })
  )

  /*
   * Lista pedidos para el panel de administración.
   */
  adminRouter.get(
    '/orders',
    W(async (req, res) => {
      const status = String(req.query.status || '')

      if (status && !STATUSES.includes(status)) {
        throw bad('Filtro de estado inválido.')
      }

      const orders = status
        ? await q(
            `SELECT
               id,
               customer_name,
               customer_phone,
               delivery,
               notes,
               status,
               subtotal,
               delivery_cost,
               total,
               items,
               created_at,
               updated_at
             FROM orders
             WHERE status = $1
             ORDER BY created_at DESC
             LIMIT 200`,
            [status]
          )
        : await q(
            `SELECT
               id,
               customer_name,
               customer_phone,
               delivery,
               notes,
               status,
               subtotal,
               delivery_cost,
               total,
               items,
               created_at,
               updated_at
             FROM orders
             ORDER BY created_at DESC
             LIMIT 200`
          )

      res.json({
        orders,
        statuses: STATUSES.map(value => ({
          value,
          label: STATUS_LABELS[value]
        }))
      })
    })
  )

  /*
   * Cambia el estado de un pedido.
   */
  adminRouter.patch(
    '/orders/:id/status',
    W(async (req, res) => {
      const id = Number(req.params.id)
      const status = String(req.body?.status || '')

      if (!Number.isInteger(id) || id <= 0) {
        throw bad('Número de pedido inválido.')
      }

      if (!STATUSES.includes(status)) {
        throw bad('El estado seleccionado no es válido.')
      }

      const [order] = await q(
        `UPDATE orders
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING
           id,
           customer_name,
           customer_phone,
           delivery,
           notes,
           status,
           subtotal,
           delivery_cost,
           total,
           items,
           created_at,
           updated_at`,
        [status, id]
      )

      if (!order) {
        throw bad('No existe ese pedido.', 404)
      }

      res.json({
        ok: true,
        order
      })
    })
  )

  /*
   * Elimina un pedido desde el panel.
   * Esta ruta queda protegida por el middleware adminRouter.
   */
  adminRouter.delete(
    '/orders/:id',
    W(async (req, res) => {
      const id = Number(req.params.id)

      if (!Number.isInteger(id) || id <= 0) {
        throw bad('Número de pedido inválido.')
      }

      const [order] = await q(
        `DELETE FROM orders
         WHERE id = $1
         RETURNING id`,
        [id]
      )

      if (!order) {
        throw bad('No existe ese pedido.', 404)
      }

      res.json({
        ok: true,
        id: order.id
      })
    })
  )
}