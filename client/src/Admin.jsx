import { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { api, money } from './api'

const ORDER_STATUSES = [
{ value: 'pending', label: 'Pendiente' },
{ value: 'confirmed', label: 'Confirmado' },
{ value: 'preparing', label: 'Preparando' },
{ value: 'ready', label: 'Listo' },
{ value: 'delivered', label: 'Entregado' },
{ value: 'cancelled', label: 'Cancelado' }
]

const useLoad = u => {
const [d, s] = useState(null)
const [error, setError] = useState('')

const l = useCallback(
() => api.get(u).then(data => {
s(data)
setError('')
}).catch(e => {
setError(e.message)
}),
[u]
)

useEffect(() => {
l()
}, [l])

return [d, l, error]
}

const Modal = ({ children, onClose }) =>

  <div className="ov" onClick={onClose}>
    <div className="sheet" onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>

const F = ({ l, children }) => <label className="f"> <span>{l}</span>
{children} </label>

function Upload({ value, onChange }) {
const [b, sb] = useState(false)

const go = async e => {
const f = e.target.files[0]
if (!f) return

sb(true)

try {
  const fd = new FormData()
  fd.append('file', f)
  onChange((await api.post('/admin/images', fd)).url)
} catch (x) {
  alert(x.message)
}

sb(false)
e.target.value = ''

}

return ( <div className="up">
{value && <img src={value} alt="" />}

  <label className="btn ghost sm">
    {b ? 'Subiendo…' : value ? 'Cambiar imagen' : 'Subir imagen'}
    <input
      hidden
      type="file"
      accept="image/png,image/jpeg,image/webp"
      onChange={go}
    />
  </label>

  {value &&
    <button
      type="button"
      className="btn ghost sm"
      onClick={() => onChange(null)}
    >
      Quitar
    </button>
  }
</div>

)
}

function Login({ done }) {
const [f, s] = useState({ email: '', password: '' })
const [e, se] = useState('')

return ( <div className="login">
<form onSubmit={async v => {
v.preventDefault()

    try {
      await api.post('/auth/login', f)
      done()
    } catch (x) {
      se(x.message)
    }
  }}>
    <h1>Panel admin</h1>

    <input
      placeholder="Email"
      autoComplete="username"
      value={f.email}
      onChange={v => s({ ...f, email: v.target.value })}
    />

    <input
      type="password"
      placeholder="Contraseña"
      autoComplete="current-password"
      value={f.password}
      onChange={v => s({ ...f, password: v.target.value })}
    />

    {e && <p className="err">{e}</p>}

    <button className="btn red full">ENTRAR</button>
  </form>
</div>

)
}

function Dashboard() {
const [s] = useLoad('/admin/stats')

if (!s) return null

return (
<> <h1>Dashboard</h1>

  <div className="stats">
    {[
      ['Productos', s.total],
      ['Disponibles', s.available],
      ['Agotados', s.soldout],
      ['Categorías', s.categories],
      ['Destacados', s.featured],
      ['Packs', s.packs]
    ].map(([k, v]) => (
      <div key={k}>
        <b>{v}</b>
        <span>{k}</span>
      </div>
    ))}
  </div>
</>

)
}

/* =========================================================
PEDIDOS
========================================================= */

function formatDate(value) {
if (!value) return 'Fecha no disponible'

const date = new Date(value)

if (Number.isNaN(date.getTime())) {
return 'Fecha no disponible'
}

return date.toLocaleString('es-UY', {
dateStyle: 'short',
timeStyle: 'short'
})
}

function normalizeItems(items) {
if (Array.isArray(items)) return items

if (typeof items === 'string') {
try {
const parsed = JSON.parse(items)
return Array.isArray(parsed) ? parsed : []
} catch {
return []
}
}

return []
}

function OrderDetails({ order }) {
const items = normalizeItems(order.items)

return (
<div
className="adm-card"
style={{ marginTop: 12, marginBottom: 12 }}
> <h3>Detalle del pedido #{order.id}</h3>

  <div style={{ marginBottom: 14 }}>
    <b>{order.customer_name}</b>
    <p style={{ margin: '5px 0' }}>
      Teléfono: {order.customer_phone}
    </p>
    <p style={{ margin: '5px 0' }}>
      Fecha: {formatDate(order.created_at)}
    </p>
    <p style={{ margin: '5px 0' }}>
      Entrega: {order.delivery ? 'A domicilio' : 'Sin envío'}
    </p>

    {order.notes &&
      <p style={{ margin: '8px 0' }}>
        <b>Notas:</b> {order.notes}
      </p>
    }
  </div>

  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {items.map((item, index) => (
      <div
        key={`${item.id}-${index}`}
        style={{
          borderTop: '1px solid #e7e7e7',
          paddingTop: 12
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'flex-start'
        }}>
          <div>
            <b>{item.name || 'Producto'}</b>
            <p style={{ margin: '4px 0', fontSize: 13 }}>
              {item.quantity} × {money(item.unit_price)}
            </p>
          </div>

          <b>{money(item.line_total)}</b>
        </div>

        {item.packSelections?.map((option, optionIndex) => {
          const selections = Array.isArray(option.selections)
            ? option.selections
            : []

          return (
            <div
              key={`${option.optionId}-${optionIndex}`}
              style={{ marginTop: 7, fontSize: 13 }}
            >
              <span style={{ fontWeight: 600 }}>
                {option.optionName}:
              </span>

              {' '}

              {selections.length
                ? selections.map(selection =>
                    `${selection.name}${selection.quantity > 1
                      ? ` × ${selection.quantity}`
                      : ''}`
                  ).join(', ')
                : 'Sin selección'}
            </div>
          )
        })}
      </div>
    ))}
  </div>

  <div style={{
    borderTop: '1px solid #e7e7e7',
    marginTop: 16,
    paddingTop: 12
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 6
    }}>
      <span>Subtotal</span>
      <span>{money(order.subtotal)}</span>
    </div>

    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 8
    }}>
      <span>Envío</span>
      <span>{money(order.delivery_cost)}</span>
    </div>

    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 18
    }}>
      <b>Total</b>
      <b>{money(order.total)}</b>
    </div>
  </div>
</div>

)
}

function Orders() {
const [filter, setFilter] = useState('')
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')
const [updating, setUpdating] = useState(null)
const [expanded, setExpanded] = useState(null)

const load = useCallback(async () => {
setLoading(true)
setError('')

try {
  const query = filter
    ? `?status=${encodeURIComponent(filter)}`
    : ''

  const result = await api.get(`/admin/orders${query}`)

  setData({
    orders: Array.isArray(result.orders) ? result.orders : [],
    statuses: Array.isArray(result.statuses)
      ? result.statuses
      : ORDER_STATUSES
  })
} catch (e) {
  setError(e.message || 'No se pudieron cargar los pedidos.')
} finally {
  setLoading(false)
}

}, [filter])

useEffect(() => {
load()
}, [load])

const changeStatus = async (order, status) => {
if (updating === order.id || order.status === status) return

setUpdating(order.id)
setError('')

try {
  await api.patch(`/admin/orders/${order.id}/status`, { status })
  await load()
} catch (e) {
  setError(e.message || 'No se pudo actualizar el estado.')
} finally {
  setUpdating(null)
}

}

const whatsappUrl = phone => {
const digits = String(phone || '').replace(/\D/g, '')
return digits
? `https://wa.me/${digits}`
: null
}

const orders = data?.orders || []
const statuses = data?.statuses?.length
? data.statuses
: ORDER_STATUSES

return (
<> <div className="bar"> <h1>Pedidos</h1>

    <button
      type="button"
      className="btn ghost"
      onClick={load}
      disabled={loading}
    >
      {loading ? 'Actualizando…' : '↻ Actualizar'}
    </button>
  </div>

  <div className="filters">
    <select
      value={filter}
      onChange={e => setFilter(e.target.value)}
    >
      <option value="">Todos los pedidos</option>

      {statuses.map(status => (
        <option key={status.value} value={status.value}>
          {status.label}
        </option>
      ))}
    </select>
  </div>

  {error &&
    <div
      className="adm-card"
      style={{ marginBottom: 14, color: '#bd1724' }}
      role="alert"
    >
      <b>No se pudo completar la operación</b>
      <p style={{ marginBottom: 0 }}>{error}</p>
      <button
        type="button"
        className="btn ghost sm"
        onClick={load}
        style={{ marginTop: 10 }}
      >
        Intentar nuevamente
      </button>
    </div>
  }

  {loading && !data &&
    <p>Cargando pedidos…</p>
  }

  {!loading && !error && orders.length === 0 &&
    <div className="adm-empty">
      <b>No hay pedidos para mostrar.</b>
      <span>
        Cuando se registre una compra, aparecerá en esta sección.
      </span>
    </div>
  }

  <div className="tbl">
    {orders.map(order => {
      const statusInfo = statuses.find(
        item => item.value === order.status
      )

      const wa = whatsappUrl(order.customer_phone)

      return (
        <div
          key={order.id}
          style={{
            padding: 14,
            borderBottom: '1px solid #e7e7e7'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <b>Pedido #{order.id} · {order.customer_name}</b>

              <small style={{
                display: 'block',
                marginTop: 5
              }}>
                {formatDate(order.created_at)}
              </small>

              <small style={{
                display: 'block',
                marginTop: 4
              }}>
                {order.customer_phone}
                {' · '}
                {order.delivery ? 'A domicilio' : 'Retiro'}
              </small>

              <b style={{
                display: 'block',
                marginTop: 8,
                fontSize: 17
              }}>
                {money(order.total)}
              </b>
            </div>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center'
            }}>
              <select
                aria-label={`Estado del pedido ${order.id}`}
                value={order.status}
                disabled={updating === order.id}
                onChange={e => changeStatus(order, e.target.value)}
                style={{ maxWidth: 170 }}
              >
                {statuses.map(status => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ))}
              </select>

              {wa &&
                <a
                  className="btn ghost sm"
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp ↗
                </a>
              }

              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setExpanded(
                  expanded === order.id ? null : order.id
                )}
              >
                {expanded === order.id
                  ? 'Ocultar detalle'
                  : 'Ver detalle'}
              </button>
            </div>
          </div>

          {updating === order.id &&
            <small style={{ display: 'block', marginTop: 8 }}>
              Actualizando estado…
            </small>
          }

          {statusInfo &&
            <small style={{ display: 'block', marginTop: 8 }}>
              Estado: {statusInfo.label}
            </small>
          }

          {expanded === order.id &&
            <OrderDetails order={order} />
          }
        </div>
      )
    })}
  </div>
</>

)
}

/* =========================================================
OPCIONES DE PACK
========================================================= */

function PackOptions({ options, setOptions, cats }) {
const add = () => {
setOptions([
...options,
{
name: '',
category_id: cats[0]?.id || '',
quantity: 1,
required: true,
sort_order: options.length
}
])
}

const update = (index, key, value) => {
setOptions(options.map((option, i) =>
i === index ? { ...option, [key]: value } : option
))
}

const remove = index => {
setOptions(
options
.filter((_, i) => i !== index)
.map((option, i) => ({ ...option, sort_order: i }))
)
}

return ( <div className="adm-card"> <div className="bar"> <div> <h3>Opciones del pack</h3> <small>
Configurá qué debe elegir el cliente al comprar este pack. </small> </div>

    <button
      type="button"
      className="btn red sm"
      onClick={add}
    >
      + Agregar opción
    </button>
  </div>

  {!options.length &&
    <div className="adm-empty">
      <b>Este pack todavía no tiene opciones.</b>
      <span>
        Agregá una opción para que el cliente pueda elegir productos al comprarlo.
      </span>
    </div>
  }

  <div>
    {options.map((option, index) => (
      <div
        key={index}
        className="adm-card"
        style={{ marginTop: 12 }}
      >
        <div className="bar">
          <strong>Opción {index + 1}</strong>

          <button
            type="button"
            className="btn ghost sm"
            onClick={() => remove(index)}
          >
            Eliminar
          </button>
        </div>

        <F l="Nombre de la opción">
          <input
            placeholder="Ej: Elegí tu tabaco"
            value={option.name || ''}
            onChange={e => update(index, 'name', e.target.value)}
          />
        </F>

        <div className="two">
          <F l="Categoría de productos">
            <select
              value={option.category_id || ''}
              onChange={e => update(index, 'category_id', e.target.value)}
            >
              <option value="" disabled>
                Elegí una categoría…
              </option>

              {cats.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </F>

          <F l="Cantidad a elegir">
            <input
              type="number"
              min="1"
              max="50"
              value={option.quantity || 1}
              onChange={e => update(index, 'quantity', Number(e.target.value))}
            />
          </F>
        </div>

        <label className="chk">
          <input
            type="checkbox"
            checked={option.required !== false}
            onChange={e => update(index, 'required', e.target.checked)}
          />
          Obligatorio
        </label>
      </div>
    ))}
  </div>
</div>

)
}

/* =========================================================
FORMULARIO DE PRODUCTO
========================================================= */

function ProductForm({ p, cats, done }) {
const [f, s] = useState(
p
? {
...p,
product_type: p.product_type || 'normal',
pack_options: p.pack_options || []
}
: {
name: '',
description: '',
price: '',
image_url: null,
category_id: cats[0]?.id || '',
available: true,
featured: false,
sort_order: 0,
product_type: 'normal',
pack_options: []
}
)

const set = (k, v) => s({ ...f, [k]: v })

const save = async e => {
e.preventDefault()

try {
  const payload = {
    ...f,
    product_type: f.product_type,
    pack_options: f.product_type === 'pack' ? f.pack_options : []
  }

  if (p) {
    await api.put('/admin/products/' + p.id, payload)
  } else {
    await api.post('/admin/products', payload)
  }

  done(true)
} catch (x) {
  alert(x.message)
}

}

return ( <form onSubmit={save}> <h2>{p ? 'Editar producto' : 'Nuevo producto'}</h2>

  <F l="Nombre">
    <input
      required
      value={f.name}
      onChange={e => set('name', e.target.value)}
    />
  </F>

  <F l="Descripción">
    <textarea
      rows="3"
      value={f.description}
      onChange={e => set('description', e.target.value)}
    />
  </F>

  <div className="two">
    <F l="Precio">
      <input
        required
        type="number"
        min="0"
        step="0.01"
        value={f.price}
        onChange={e => set('price', e.target.value)}
      />
    </F>

    <F l="Orden">
      <input
        type="number"
        value={f.sort_order}
        onChange={e => set('sort_order', e.target.value)}
      />
    </F>
  </div>

  <F l="Categoría">
    <select
      required
      value={f.category_id || ''}
      onChange={e => set('category_id', e.target.value)}
    >
      <option value="" disabled>Elegí…</option>

      {cats.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  </F>

  <F l="Tipo de producto">
    <select
      value={f.product_type || 'normal'}
      onChange={e => {
        const type = e.target.value
        set('product_type', type)

        if (type === 'normal') set('pack_options', [])
      }}
    >
      <option value="normal">Producto normal</option>
      <option value="pack">Pack</option>
    </select>
  </F>

  {f.product_type === 'pack' &&
    <PackOptions
      options={f.pack_options || []}
      setOptions={options => set('pack_options', options)}
      cats={cats}
    />
  }

  <F l="Imagen">
    <Upload value={f.image_url} onChange={v => set('image_url', v)} />
  </F>

  <label className="chk">
    <input
      type="checkbox"
      checked={f.available}
      onChange={e => set('available', e.target.checked)}
    />
    Disponible
  </label>

  <label className="chk">
    <input
      type="checkbox"
      checked={f.featured}
      onChange={e => set('featured', e.target.checked)}
    />
    Destacado
  </label>

  <div className="row">
    <button
      type="button"
      className="btn ghost"
      onClick={() => done()}
    >
      CANCELAR
    </button>

    <button className="btn red grow">
      {p ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
    </button>
  </div>
</form>

)
}

/* =========================================================
PRODUCTOS
========================================================= */

function Products() {
const [ps, load] = useLoad('/admin/products')
const [cs] = useLoad('/admin/categories')

const [q, sq] = useState('')
const [fc, sfc] = useState('')
const [fa, sfa] = useState('')
const [ft, sft] = useState('')
const [ed, sed] = useState(null)
const [del, sdel] = useState(null)

if (!ps || !cs) return null

const list = ps.filter(p =>
p.name.toLowerCase().includes(q.toLowerCase()) &&
(!fc || p.category_id == fc) &&
(!fa || String(p.available) === fa) &&
(!ft || (ft === 'pack'
? p.product_type === 'pack'
: p.product_type !== 'pack'))
)

return (
<> <div className="bar"> <h1>Productos</h1>

    <button className="btn red" onClick={() => sed({})}>
      + Nuevo producto
    </button>
  </div>

  <div className="filters">
    <input
      placeholder="Buscar…"
      value={q}
      onChange={e => sq(e.target.value)}
    />

    <select value={fc} onChange={e => sfc(e.target.value)}>
      <option value="">Todas las categorías</option>
      {cs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>

    <select value={ft} onChange={e => sft(e.target.value)}>
      <option value="">Todos los tipos</option>
      <option value="normal">Productos normales</option>
      <option value="pack">Packs</option>
    </select>

    <select value={fa} onChange={e => sfa(e.target.value)}>
      <option value="">Todos</option>
      <option value="true">Disponibles</option>
      <option value="false">Agotados</option>
    </select>
  </div>

  <div className="tbl">
    {list.map(p => (
      <div className="tr" key={p.id}>
        {p.image_url
          ? <img src={p.image_url} alt="" />
          : <div className="noimg" />
        }

        <div className="grow">
          <b>
            {p.name}
            {p.product_type === 'pack' &&
              <span style={{
                marginLeft: 8,
                fontSize: 11,
                padding: '3px 7px',
                borderRadius: 20,
                background: '#bd1724',
                color: '#fff'
              }}>
                PACK
              </span>
            }
          </b>

          <small>
            {p.category_name || 'Sin categoría'} · {money(p.price)}
            {p.featured ? ' · ★' : ''}
          </small>

          {p.product_type === 'pack' &&
            <small>
              {p.pack_options?.length || 0} opción(es) configurada(s)
            </small>
          }
        </div>

        <label className="sw">
          <input
            type="checkbox"
            checked={p.available}
            onChange={async e => {
              try {
                await api.patch(`/admin/products/${p.id}/available`, {
                  available: e.target.checked
                })
                load()
              } catch (x) {
                alert(x.message)
              }
            }}
          />
          <i />
        </label>

        <button className="btn ghost sm" onClick={() => sed(p)}>
          Editar
        </button>

        <button className="btn ghost sm" onClick={() => sdel(p)}>
          Eliminar
        </button>
      </div>
    ))}

    {!list.length && <p>Sin resultados.</p>}
  </div>

  {ed &&
    <Modal onClose={() => sed(null)}>
      <ProductForm
        p={ed.id ? ed : null}
        cats={cs}
        done={ok => {
          sed(null)
          if (ok) load()
        }}
      />
    </Modal>
  }

  {del &&
    <Modal onClose={() => sdel(null)}>
      <h2>¿Seguro que querés eliminar este producto?</h2>
      <p>{del.name}</p>

      <div className="row">
        <button className="btn ghost grow" onClick={() => sdel(null)}>
          CANCELAR
        </button>

        <button
          className="btn red grow"
          onClick={async () => {
            try {
              await api.del('/admin/products/' + del.id)
              sdel(null)
              load()
            } catch (x) {
              alert(x.message)
            }
          }}
        >
          ELIMINAR
        </button>
      </div>
    </Modal>
  }
</>

)
}

/* =========================================================
CATEGORÍAS
========================================================= */

function Categories() {
const [cs, load] = useLoad('/admin/categories')
const [ed, sed] = useState(null)

if (!cs) return null

const move = async (i, d) => {
const ids = cs.map(c => c.id)
;[ids[i], ids[i + d]] = [ids[i + d], ids[i]]

try {
  await api.put('/admin/categories/reorder', { ids })
  load()
} catch (x) {
  alert(x.message)
}

}

const save = async e => {
e.preventDefault()

try {
  if (ed.id) {
    await api.put('/admin/categories/' + ed.id, ed)
  } else {
    await api.post('/admin/categories', {
      ...ed,
      sort_order: cs.length
    })
  }

  sed(null)
  load()
} catch (x) {
  alert(x.message)
}

}

return (
<> <div className="bar"> <h1>Categorías</h1>

    <button
      className="btn red"
      onClick={() => sed({
        name: '',
        image_url: null,
        active: true
      })}
    >
      + Nueva categoría
    </button>
  </div>

  <div className="tbl">
    {cs.map((c, i) => (
      <div className="tr" key={c.id}>
        <div className="grow">
          <b>{c.name}</b>
          <small>
            {c.product_count} producto(s)
            {!c.active && ' · oculta'}
          </small>
        </div>

        <button
          className="btn ghost sm"
          disabled={!i}
          onClick={() => move(i, -1)}
        >
          ↑
        </button>

        <button
          className="btn ghost sm"
          disabled={i === cs.length - 1}
          onClick={() => move(i, 1)}
        >
          ↓
        </button>

        <label className="sw">
          <input
            type="checkbox"
            checked={c.active}
            onChange={async e => {
              try {
                await api.patch(`/admin/categories/${c.id}/active`, {
                  active: e.target.checked
                })
                load()
              } catch (x) {
                alert(x.message)
              }
            }}
          />
          <i />
        </label>

        <button className="btn ghost sm" onClick={() => sed(c)}>
          Editar
        </button>

        <button
          className="btn ghost sm"
          onClick={async () => {
            if (confirm('¿Eliminar la categoría?')) {
              try {
                await api.del('/admin/categories/' + c.id)
                load()
              } catch (x) {
                alert(x.message)
              }
            }
          }}
        >
          Eliminar
        </button>
      </div>
    ))}
  </div>

  {ed &&
    <Modal onClose={() => sed(null)}>
      <form onSubmit={save}>
        <h2>{ed.id ? 'Editar' : 'Nueva'} categoría</h2>

        <F l="Nombre">
          <input
            required
            value={ed.name}
            onChange={e => sed({ ...ed, name: e.target.value })}
          />
        </F>

        <F l="Imagen (opcional)">
          <Upload
            value={ed.image_url}
            onChange={v => sed({ ...ed, image_url: v })}
          />
        </F>

        <label className="chk">
          <input
            type="checkbox"
            checked={ed.active}
            onChange={e => sed({ ...ed, active: e.target.checked })}
          />
          Activa
        </label>

        <div className="row">
          <button
            type="button"
            className="btn ghost grow"
            onClick={() => sed(null)}
          >
            CANCELAR
          </button>

          <button className="btn red grow">GUARDAR</button>
        </div>
      </form>
    </Modal>
  }
</>

)
}

/* =========================================================
CONFIGURACIÓN
========================================================= */

function Settings() {
const [s] = useLoad('/admin/settings')
const [f, sf] = useState(null)

useEffect(() => {
if (s) sf(s)
}, [s])

if (!f) return null

const set = (k, v) => sf({ ...f, [k]: v })

const T = ([k, l, ta]) => <F key={k} l={l}>
{ta
? <textarea
rows="3"
value={f[k] || ''}
onChange={e => set(k, e.target.value)}
/>
: <input
value={f[k] || ''}
onChange={e => set(k, e.target.value)}
/>
} </F>

return (
<form
className="narrow"
onSubmit={async e => {
e.preventDefault()

    try {
      await api.put('/admin/settings', f)
      alert('Guardado')
    } catch (x) {
      alert(x.message)
    }
  }}
>
  <h1>Configuración</h1>

  {T(['business_name', 'Nombre del negocio'])}

  <F l="Logo">
    <Upload value={f.logo_url} onChange={v => set('logo_url', v)} />
  </F>

  {T(['whatsapp_number', 'WhatsApp (con código de país, solo números)'])}
  {T(['instagram', 'Instagram'])}
  {T(['welcome_text', 'Texto de bienvenida (título del hero)'])}
  {T(['hero_text', 'Texto del hero', 1])}
  {T(['opening_hours', 'Horario de atención', 1])}
  {T(['whatsapp_message', 'Mensaje inicial de WhatsApp', 1])}

  <button className="btn red full">GUARDAR</button>
</form>

)
}

/* =========================================================
ADMIN PRINCIPAL
========================================================= */

export default function Admin() {
const [u, su] = useState(undefined)

const me = () =>
api.get('/auth/me')
.then(su)
.catch(() => su(null))

useEffect(() => {
me()
}, [])

if (u === undefined) return null

if (!u) {
return <Login done={me} />
}

return ( <div className="adm"> <aside> <b>Admin</b>

    {[
      ['', 'Dashboard'],
      ['pedidos', 'Pedidos'],
      ['productos', 'Productos'],
      ['categorias', 'Categorías'],
      ['configuracion', 'Configuración']
    ].map(([p, l]) => (
      <NavLink
        key={p}
        end={!p}
        to={'/admin/' + p}
      >
        {l}
      </NavLink>
    ))}

    <a href="/" target="_blank" rel="noreferrer">
      Ver catálogo ↗
    </a>

    <button
      onClick={async () => {
        try {
          await api.post('/auth/logout')
          su(null)
        } catch (e) {
          alert(e.message)
        }
      }}
    >
      Cerrar sesión
    </button>
  </aside>

  <section>
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="pedidos" element={<Orders />} />
      <Route path="productos" element={<Products />} />
      <Route path="categorias" element={<Categories />} />
      <Route path="configuracion" element={<Settings />} />
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  </section>
</div>

)
}

