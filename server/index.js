import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import multer from 'multer'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { q } from './db.js'
import { registerOrderRoutes } from './orders.js'

const {
  JWT_SECRET,
  STORAGE_URL,
  STORAGE_KEY,
  STORAGE_BUCKET = 'images',
  PORT = 3001,
  NODE_ENV
} = process.env

if (!JWT_SECRET || JWT_SECRET.length < 24) {
  throw new Error('JWT_SECRET (24+ caracteres) es obligatorio')
}

const sb =
  STORAGE_URL && STORAGE_KEY
    ? createClient(STORAGE_URL, STORAGE_KEY)
    : null

const app = express()

app.disable('x-powered-by')

app.use(
  express.json({ limit: '100kb' }),
  cookieParser()
)

const W = f => (a, b, n) => f(a, b, n).catch(n)

const bad = (m, s = 400) =>
  Object.assign(new Error(m), { status: s })

const auth = (req, res, next) => {
  try {
    const u = jwt.verify(
      req.cookies.token,
      JWT_SECRET
    )

    if (u.role !== 'admin') {
      throw 0
    }

    req.user = u
    next()
  } catch {
    res.status(401).json({
      error: 'No autorizado'
    })
  }
}

/* =========================================================
   AUTH
========================================================= */

const tries = new Map()

app.post(
  '/api/auth/login',
  W(async (req, res) => {
    const k = req.ip

    const t =
      tries.get(k) || {
        n: 0,
        at: Date.now()
      }

    if (Date.now() - t.at > 9e5) {
      t.n = 0
      t.at = Date.now()
    }

    if (t.n >= 10) {
      throw bad(
        'Demasiados intentos, esperá unos minutos',
        429
      )
    }

    const {
      email,
      password
    } = req.body || {}

    const [u] = await q(
      'select * from users where email=$1',
      [String(email || '').toLowerCase()]
    )

    if (
      !(
        u &&
        typeof password === 'string' &&
        await bcrypt.compare(
          password,
          u.password_hash
        )
      )
    ) {
      t.n++
      tries.set(k, t)

      throw bad(
        'Credenciales incorrectas',
        401
      )
    }

    tries.delete(k)

    res.cookie(
      'token',
      jwt.sign(
        {
          id: u.id,
          role: u.role,
          email: u.email
        },
        JWT_SECRET,
        {
          expiresIn: '7d'
        }
      ),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: NODE_ENV === 'production',
        maxAge: 6048e5
      }
    )

    res.json({
      email: u.email
    })
  })
)

app.post(
  '/api/auth/logout',
  (req, res) =>
    res.clearCookie('token').json({
      ok: true
    })
)

app.get(
  '/api/auth/me',
  auth,
  (req, res) =>
    res.json({
      email: req.user.email,
      role: req.user.role
    })
)

/* =========================================================
   HELPERS DE PACKS
========================================================= */

const normalizePackOptions = body => {
  if (!Array.isArray(body?.pack_options)) {
    return []
  }

  return body.pack_options.map((option, index) => {
    const name = String(
      option?.name || ''
    ).trim()

    const categoryId = Number(
      option?.category_id
    )

    const quantity = Number(
      option?.quantity ?? 1
    )

    const required =
      option?.required !== false

    const sortOrder = Number.isFinite(
      Number(option?.sort_order)
    )
      ? Number(option.sort_order)
      : index

    if (!name || name.length > 120) {
      throw bad(
        'Nombre de opción de pack inválido'
      )
    }

    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0
    ) {
      throw bad(
        'Categoría de opción de pack inválida'
      )
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > 50
    ) {
      throw bad(
        'Cantidad de elección inválida'
      )
    }

    return {
      name,
      category_id: categoryId,
      quantity,
      required,
      sort_order: sortOrder
    }
  })
}

const savePackOptions = async (
  productId,
  options
) => {
  await q(
    'delete from pack_options where product_id=$1',
    [productId]
  )

  if (!options.length) {
    return
  }

  for (const option of options) {
    await q(
      `insert into pack_options(
        product_id,
        name,
        category_id,
        quantity,
        required,
        sort_order
      )
      values($1,$2,$3,$4,$5,$6)`,
      [
        productId,
        option.name,
        option.category_id,
        option.quantity,
        option.required,
        option.sort_order
      ]
    )
  }
}

const getPackOptions = async productId => {
  return q(
    `select
      po.id,
      po.product_id,
      po.name,
      po.category_id,
      po.quantity,
      po.required,
      po.sort_order,
      c.name as category_name
    from pack_options po
    join categories c
      on c.id=po.category_id
    where po.product_id=$1
    order by po.sort_order,po.id`,
    [productId]
  )
}

const getAllPackOptions = async () => {
  return q(
    `select
      po.id,
      po.product_id,
      po.name,
      po.category_id,
      po.quantity,
      po.required,
      po.sort_order,
      c.name as category_name
    from pack_options po
    join categories c
      on c.id=po.category_id
    order by po.product_id,po.sort_order,po.id`
  )
}

const attachPackOptions = async products => {
  if (!products.length) {
    return []
  }

  const options = await getAllPackOptions()

  const grouped = new Map()

  for (const option of options) {
    if (!grouped.has(option.product_id)) {
      grouped.set(option.product_id, [])
    }

    grouped.get(option.product_id).push(option)
  }

  return products.map(product => ({
    ...product,
    pack_options:
      product.product_type === 'pack'
        ? grouped.get(product.id) || []
        : []
  }))
}

/* =========================================================
   PUBLIC
========================================================= */

app.get(
  '/api/public',
  W(async (req, res) => {
    const [settings] = await q(
      'select * from settings where id=1'
    )

    const categories = await q(
      `select
        id,
        name,
        image_url,
        sort_order
      from categories
      where active
      order by sort_order,id`
    )

    const products = await q(
      `select
        p.id,
        p.name,
        p.description,
        p.price,
        p.image_url,
        p.category_id,
        p.available,
        p.featured,
        p.product_type
      from products p
      join categories c
        on c.id=p.category_id
        and c.active
      order by p.sort_order,p.id`
    )

    const productsWithOptions =
      await attachPackOptions(products)

    res.json({
      settings,
      categories,
      products: productsWithOptions
    })
  })
)

/* =========================================================
   ADMIN
========================================================= */

const A = express.Router()

A.use(auth)

app.use(
  '/api/admin',
  A
)

registerOrderRoutes({
  app,
  adminRouter: A,
  q,
  bad
})

/* =========================================================
   IMÁGENES
========================================================= */

const delImg = async url => {
  if (!sb || !url) {
    return
  }

  const f =
    url.split(
      `/${STORAGE_BUCKET}/`
    )[1]

  if (f) {
    await sb.storage
      .from(STORAGE_BUCKET)
      .remove([
        decodeURIComponent(f)
      ])
      .catch(() => {})
  }
}

/* =========================================================
   PRODUCTOS
========================================================= */

const prod = b => {
  const n = String(
    b.name || ''
  ).trim()

  const p = Number(
    b.price
  )

  const productType =
    b.product_type === 'pack'
      ? 'pack'
      : 'normal'

  if (
    !n ||
    n.length > 120 ||
    !Number.isFinite(p) ||
    p < 0
  ) {
    throw bad(
      'Nombre o precio inválido'
    )
  }

  return [
    n,
    String(
      b.description || ''
    ).slice(0, 2000),
    p,
    b.image_url || null,
    b.category_id || null,
    b.available !== false,
    !!b.featured,
    parseInt(b.sort_order) || 0,
    productType
  ]
}

const PL = `
  select
    p.*,
    c.name as category_name
  from products p
  left join categories c
    on c.id=p.category_id
`

/* LISTAR PRODUCTOS */

A.get(
  '/products',
  W(async (req, res) => {
    const products = await q(
      PL +
      ' order by p.sort_order,p.id'
    )

    res.json(
      await attachPackOptions(products)
    )
  })
)

/* PRODUCTO INDIVIDUAL */

A.get(
  '/products/:id',
  W(async (req, res) => {
    const [product] = await q(
      PL +
      ' where p.id=$1',
      [req.params.id]
    )

    if (!product) {
      return res
        .status(404)
        .json({
          error: 'No existe'
        })
    }

    const packOptions =
      product.product_type === 'pack'
        ? await getPackOptions(
            product.id
          )
        : []

    res.json({
      ...product,
      pack_options: packOptions
    })
  })
)

/* CREAR PRODUCTO */

A.post(
  '/products',
  W(async (req, res) => {
    const data = prod(
      req.body
    )

    const productType =
      data[8]

    const packOptions =
      productType === 'pack'
        ? normalizePackOptions(
            req.body
          )
        : []

    const [product] = await q(
      `insert into products(
        name,
        description,
        price,
        image_url,
        category_id,
        available,
        featured,
        sort_order,
        product_type
      )
      values(
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      )
      returning *`,
      data
    )

    if (
      productType === 'pack'
    ) {
      await savePackOptions(
        product.id,
        packOptions
      )
    }

    const options =
      await getPackOptions(
        product.id
      )

    res
      .status(201)
      .json({
        ...product,
        pack_options: options
      })
  })
)

/* EDITAR PRODUCTO */

A.put(
  '/products/:id',
  W(async (req, res) => {
    const [old] = await q(
      `select
        id,
        image_url
      from products
      where id=$1`,
      [req.params.id]
    )

    if (!old) {
      throw bad(
        'No existe',
        404
      )
    }

    const data = prod(
      req.body
    )

    const productType =
      data[8]

    const packOptions =
      productType === 'pack'
        ? normalizePackOptions(
            req.body
          )
        : []

    const [product] =
      await q(
        `update products
        set
          name=$1,
          description=$2,
          price=$3,
          image_url=$4,
          category_id=$5,
          available=$6,
          featured=$7,
          sort_order=$8,
          product_type=$9,
          updated_at=now()
        where id=$10
        returning *`,
        [
          ...data,
          req.params.id
        ]
      )

    await savePackOptions(
      product.id,
      packOptions
    )

    if (
      old.image_url &&
      old.image_url !==
        product.image_url
    ) {
      await delImg(
        old.image_url
      )
    }

    res.json({
      ...product,
      pack_options:
        await getPackOptions(
          product.id
        )
    })
  })
)

/* DISPONIBILIDAD */

A.patch(
  '/products/:id/available',
  W(async (req, res) => {
    const [product] =
      await q(
        `update products
        set
          available=$1,
          updated_at=now()
        where id=$2
        returning *`,
        [
          !!req.body.available,
          req.params.id
        ]
      )

    if (!product) {
      return res
        .status(404)
        .json({
          error: 'No existe'
        })
    }

    res.json(product)
  })
)

/* ELIMINAR PRODUCTO */

A.delete(
  '/products/:id',
  W(async (req, res) => {
    const [product] =
      await q(
        `delete from products
        where id=$1
        returning image_url`,
        [req.params.id]
      )

    if (!product) {
      throw bad(
        'No existe',
        404
      )
    }

    await delImg(
      product.image_url
    )

    res.json({
      ok: true
    })
  })
)

/* ELIMINAR DATOS DE PRUEBA */

A.delete(
  '/test-data',
  W(async (req, res) => {
    await q(
      'delete from products where is_test'
    )

    await q(
      `delete from categories c
      where is_test
      and not exists(
        select 1
        from products p
        where p.category_id=c.id
      )`
    )

    res.json({
      ok: true
    })
  })
)

/* =========================================================
   OPCIONES DE PACK
========================================================= */

/*
  Este endpoint permite consultar las opciones
  configuradas para un pack.
*/

A.get(
  '/products/:id/pack-options',
  W(async (req, res) => {
    const [product] =
      await q(
        'select id,product_type from products where id=$1',
        [req.params.id]
      )

    if (!product) {
      throw bad(
        'No existe',
        404
      )
    }

    if (
      product.product_type !== 'pack'
    ) {
      return res.json([])
    }

    res.json(
      await getPackOptions(
        product.id
      )
    )
  })
)

/*
  Reemplaza todas las opciones de un pack.
*/

A.put(
  '/products/:id/pack-options',
  W(async (req, res) => {
    const [product] =
      await q(
        `select
          id,
          product_type
        from products
        where id=$1`,
        [req.params.id]
      )

    if (!product) {
      throw bad(
        'No existe',
        404
      )
    }

    if (
      product.product_type !== 'pack'
    ) {
      throw bad(
        'El producto no es un pack'
      )
    }

    const options =
      normalizePackOptions(
        req.body
      )

    await savePackOptions(
      product.id,
      options
    )

    res.json(
      await getPackOptions(
        product.id
      )
    )
  })
)

/*
  Eliminar una sola opción.
*/

A.delete(
  '/pack-options/:id',
  W(async (req, res) => {
    const [option] =
      await q(
        `delete from pack_options
        where id=$1
        returning id`,
        [req.params.id]
      )

    if (!option) {
      throw bad(
        'No existe',
        404
      )
    }

    res.json({
      ok: true
    })
  })
)

/* =========================================================
   CATEGORÍAS
========================================================= */

const cat = b => {
  const n = String(
    b.name || ''
  ).trim()

  if (
    !n ||
    n.length > 60
  ) {
    throw bad(
      'Nombre inválido'
    )
  }

  return [
    n,
    b.image_url || null,
    b.active !== false,
    parseInt(b.sort_order) || 0
  ]
}

A.get(
  '/categories',
  W(async (req, res) =>
    res.json(
      await q(
        `select
          c.*,
          (
            select count(*)::int
            from products p
            where p.category_id=c.id
          ) product_count
        from categories c
        order by sort_order,id`
      )
    )
  )
)

A.post(
  '/categories',
  W(async (req, res) => {
    const [category] =
      await q(
        `insert into categories(
          name,
          image_url,
          active,
          sort_order
        )
        values($1,$2,$3,$4)
        returning *`,
        cat(req.body)
      )

    res
      .status(201)
      .json(category)
  })
)

A.put(
  '/categories/reorder',
  W(async (req, res) => {
    const ids =
      (req.body.ids || [])
        .map(Number)

    if (
      !ids.length ||
      ids.some(
        i =>
          !Number.isInteger(i)
      )
    ) {
      throw bad(
        'Datos inválidos'
      )
    }

    await q(
      `update categories c
      set
        sort_order=v.o,
        updated_at=now()
      from (
        select
          id,
          ord-1 o
        from unnest(
          $1::int[]
        ) with ordinality t(
          id,
          ord
        )
      ) v
      where c.id=v.id`,
      [ids]
    )

    res.json({
      ok: true
    })
  })
)

A.put(
  '/categories/:id',
  W(async (req, res) => {
    const [category] =
      await q(
        `update categories
        set
          name=$1,
          image_url=$2,
          active=$3,
          sort_order=$4,
          updated_at=now()
        where id=$5
        returning *`,
        [
          ...cat(req.body),
          req.params.id
        ]
      )

    if (!category) {
      return res
        .status(404)
        .json({
          error: 'No existe'
        })
    }

    res.json(category)
  })
)

A.patch(
  '/categories/:id/active',
  W(async (req, res) => {
    const [category] =
      await q(
        `update categories
        set
          active=$1,
          updated_at=now()
        where id=$2
        returning *`,
        [
          !!req.body.active,
          req.params.id
        ]
      )

    if (!category) {
      return res
        .status(404)
        .json({
          error: 'No existe'
        })
    }

    res.json(category)
  })
)

A.delete(
  '/categories/:id',
  W(async (req, res) => {
    const [{ n }] =
      await q(
        `select count(*)::int n
        from products
        where category_id=$1`,
        [req.params.id]
      )

    if (n) {
      throw bad(
        `La categoría tiene ${n} producto(s). Movelos a otra categoría o desactivá la categoría.`,
        409
      )
    }

    await q(
      'delete from categories where id=$1',
      [req.params.id]
    )

    res.json({
      ok: true
    })
  })
)

/* =========================================================
   SETTINGS
========================================================= */

const SF = [
  'business_name',
  'logo_url',
  'whatsapp_number',
  'instagram',
  'welcome_text',
  'hero_text',
  'opening_hours',
  'whatsapp_message'
]

A.get(
  '/settings',
  W(async (req, res) =>
    res.json(
      (
        await q(
          'select * from settings where id=1'
        )
      )[0]
    )
  )
)

A.put(
  '/settings',
  W(async (req, res) => {
    const b =
      req.body || {}

    const v = SF.map(
      k =>
        b[k] == null
          ? ''
          : String(
              b[k]
            ).slice(0, 1000)
    )

    v[1] =
      b.logo_url || null

    v[2] =
      v[2].replace(
        /\D/g,
        ''
      )

    const [x] =
      await q(
        `update settings
        set ${SF
          .map(
            (k, i) =>
              `${k}=$${i + 1}`
          )
          .join(',')}
        where id=1
        returning *`,
        v
      )

    res.json(x)
  })
)

/* =========================================================
   UPLOAD DE IMÁGENES
========================================================= */

const up = multer({
  storage:
    multer.memoryStorage(),

  limits: {
    fileSize:
      3 * 1024 * 1024
  },

  fileFilter: (
    req,
    file,
    cb
  ) =>
    cb(
      /^image\/(jpeg|png|webp)$/.test(
        file.mimetype
      )
        ? null
        : bad(
            'Solo JPG, PNG o WebP'
          ),
      true
    )
})

A.post(
  '/images',
  up.single('file'),
  W(async (req, res) => {
    if (!sb) {
      throw bad(
        'Storage no configurado (STORAGE_URL / STORAGE_KEY)',
        500
      )
    }

    if (!req.file) {
      throw bad(
        'Falta el archivo'
      )
    }

    const name =
      `${crypto.randomUUID()}.${req.file.mimetype.split('/')[1]}`

    const {
      error
    } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(
        name,
        req.file.buffer,
        {
          contentType:
            req.file.mimetype
        }
      )

    if (error) {
      throw bad(
        error.message,
        500
      )
    }

    res.json({
      url:
        sb.storage
          .from(
            STORAGE_BUCKET
          )
          .getPublicUrl(
            name
          ).data.publicUrl
    })
  })
)

A.delete(
  '/images',
  W(async (req, res) => {
    await delImg(
      req.body.url
    )

    res.json({
      ok: true
    })
  })
)

/* =========================================================
   STATS
========================================================= */

A.get(
  '/stats',
  W(async (req, res) =>
    res.json(
      (
        await q(
          `select
            (
              select count(*)::int
              from products
            ) total,

            (
              select count(*)::int
              from products
              where available
            ) available,

            (
              select count(*)::int
              from products
              where not available
            ) soldout,

            (
              select count(*)::int
              from categories
            ) categories,

            (
              select count(*)::int
              from products
              where featured
            ) featured,

            (
              select count(*)::int
              from products
              where product_type='pack'
            ) packs`
        )
      )[0]
    )
  )
)

/* =========================================================
   FRONTEND BUILD
========================================================= */

const dist =
  path.join(
    path.dirname(
      fileURLToPath(
        import.meta.url
      )
    ),
    '../client/dist'
  )

if (
  fs.existsSync(dist)
) {
  app.use(
    express.static(dist)
  )

  app.get(
    '*',
    (req, res) =>
      res.sendFile(
        path.join(
          dist,
          'index.html'
        )
      )
  )
}

/* =========================================================
   ERRORES
========================================================= */

app.use(
  (e, req, res, next) => {
    const m = {
      '23503':
        'Categoría inexistente',

      '22P02':
        'Datos inválidos',

      '23505':
        'Ya existe'
    }[e.code]

    if (
      e.status ||
      m
    ) {
      return res
        .status(
          e.status || 400
        )
        .json({
          error:
            m ||
            e.message
        })
    }

    console.error(e)

    res
      .status(500)
      .json({
        error:
          'Error del servidor'
      })
  }
)

app.listen(
  PORT,
  () =>
    console.log(
      'API en :' + PORT
    )
)