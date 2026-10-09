
import { useEffect, useMemo, useState } from 'react'
import { api, money } from './api'

const Icon = ({ name, size = 20, strokeWidth = 2, className = '' }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className
  }

  const icons = {
    cart: <><circle cx="9" cy="20" r="1" /><circle cx="19" cy="20" r="1" /><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    trash: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    flame: <path d="M12.5 3C14 6.5 11 8 13 11c.9-1.1 2.3-1.9 2.6-4.1C18.5 10 20 13 20 16a8 8 0 0 1-16 0c0-3.7 2-6.6 5.1-8.8-.1 2.2.7 3.5 1.9 4.5C12.7 8.2 11.9 6.1 12.5 3Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="M12 3 2.8 19a1 1 0 0 0 .9 1.5h16.6a1 1 0 0 0 .9-1.5L12 3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none" /></>,
    whatsapp: <><path d="M20.5 11.5a8.5 8.5 0 0 1-12.8 7.4L4 20l1.2-3.5A8.5 8.5 0 1 1 20.5 11.5Z" /><path d="M9 8.5c.3-.4.6-.4.9-.1l1 1.2c.2.2.2.5 0 .8l-.5.6c.6 1.2 1.5 2.1 2.7 2.7l.6-.5c.3-.2.6-.2.8 0l1.2 1c.3.3.3.6-.1.9-.5.4-1.2.7-1.9.5-2.2-.5-5.1-3.4-5.6-5.6-.2-.7.1-1.4.5-1.9Z" /></>,
    spark: <path d="m12 2 1.2 6.8L19 12l-5.8 1.2L12 20l-1.2-6.8L5 12l5.8-3.2L12 2Z" />,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></>,
    package: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>
  }

  return <svg {...common}>{icons[name]}</svg>
}

const Hookah = () => (
  <div className="hero-hookah">
    <svg viewBox="0 0 120 200" width="120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="44" y="6" width="32" height="22" rx="4" />
      <path d="M60 28v70M48 40h24" />
      <path d="M60 98c-30 0-42 30-42 52s14 36 42 36 42-14 42-36-12-52-42-52z" />
      <path d="M102 120c14 0 18 14 18 30" />
    </svg>
    <span className="hero-orbit hero-orbit-1" />
    <span className="hero-orbit hero-orbit-2" />
  </div>
)

export default function Public() {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const [cat, setCat] = useState(0)
  const [prod, setProd] = useState(null)
  const [qty, setQty] = useState(1)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [packSelections, setPackSelections] = useState({})
  const [packError, setPackError] = useState('')
  const [delivery, setDelivery] = useState(false)

  // Datos del cliente y estado del pedido
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [sendingOrder, setSendingOrder] = useState(false)
  const [orderError, setOrderError] = useState('')

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart')) || []
    } catch {
      return []
    }
  })

  useEffect(() => {
    api.get('/public')
      .then(x => {
        setD(x)
        document.title = x.settings.business_name
      })
      .catch(e => setErr(e.message))
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  const productType = p => p?.product_type || p?.productType || 'normal'
  const packOptions = p => Array.isArray(p?.pack_options) ? p.pack_options : Array.isArray(p?.packOptions) ? p.packOptions : []

  const lines = useMemo(() => {
    if (!d) return []
    return cart.map(c => ({
      item: c,
      p: d.products.find(p => p.id === c.id),
      qty: c.qty
    })).filter(l => l.p && l.p.available)
  }, [cart, d])

  if (err) {
    return <div className="state-page"><Icon name="alert" size={32} /><p>{err}</p></div>
  }

  if (!d) {
    return <div className="state-page"><div className="loader" /><p>Cargando catálogo...</p></div>
  }

  const s = d.settings
  const subtotal = lines.reduce((a, l) => a + l.p.price * l.qty, 0)
  const deliveryCost = delivery ? 30 : 0
  const total = subtotal + deliveryCost
  const count = lines.reduce((a, l) => a + l.qty, 0)
  const isPack = p => productType(p) === 'pack'

  const normalizePackOptions = p => packOptions(p).map((option, index) => ({
    ...option,
    id: option.id || `temp-${index}`,
    quantity: Number(option.quantity) || 1,
    required: option.required !== false
  }))

  const availableProductsForOption = option => d.products.filter(
    p => p.available && p.category_id === Number(option.category_id)
  )

  const getOptionSelections = optionId => {
    const current = packSelections[optionId]
    if (!current || typeof current !== 'object') return {}
    return current
  }

  const optionSelectedCount = optionId => Object.values(
    getOptionSelections(optionId)
  ).reduce((sum, n) => sum + Number(n || 0), 0)

  const changePackSelection = (option, productId, delta) => {
    setPackSelections(current => {
      const optionSelections = { ...(current[option.id] || {}) }
      const currentQty = Number(optionSelections[productId] || 0)
      const totalSelected = Object.values(optionSelections).reduce(
        (sum, n) => sum + Number(n || 0), 0
      )
      const max = Number(option.quantity) || 1
      let nextQty = currentQty + delta

      if (nextQty < 0) nextQty = 0
      if (delta > 0 && totalSelected >= max) return current

      if (nextQty <= 0) delete optionSelections[productId]
      else optionSelections[productId] = nextQty

      return { ...current, [option.id]: optionSelections }
    })
    setPackError('')
  }

  const resetPackSelection = p => {
    const initial = {}
    normalizePackOptions(p).forEach(option => {
      initial[option.id] = {}
    })
    setPackSelections(initial)
    setPackError('')
  }

  const validatePack = p => {
    const options = normalizePackOptions(p)
    if (!options.length) return { valid: true, selections: [] }

    const result = []

    for (const option of options) {
      const selected = getOptionSelections(option.id)
      const selectedCount = Object.values(selected).reduce(
        (sum, n) => sum + Number(n || 0), 0
      )
      const requiredQuantity = Number(option.quantity) || 1

      if (option.required && selectedCount !== requiredQuantity) {
        return {
          valid: false,
          message: requiredQuantity === 1
            ? `Elegí una opción en "${option.name}".`
            : `Elegí ${requiredQuantity} opciones en "${option.name}".`
        }
      }

      if (!option.required && selectedCount > 0 && selectedCount !== requiredQuantity) {
        return {
          valid: false,
          message: `La opción "${option.name}" debe tener ${requiredQuantity} selección${requiredQuantity === 1 ? '' : 'es'}.`
        }
      }

      const products = Object.entries(selected).map(([productId, quantity]) => {
        const product = d.products.find(p => p.id === Number(productId))
        if (!product || !product.available) return null
        return {
          id: product.id,
          name: product.name,
          quantity: Number(quantity)
        }
      }).filter(Boolean)

      result.push({
        optionId: option.id,
        optionName: option.name,
        quantity: requiredQuantity,
        selections: products
      })
    }

    return { valid: true, selections: result }
  }

  const selectionKey = selections => JSON.stringify(
    selections.map(option => ({
      optionId: option.optionId,
      selections: option.selections.map(x => ({
        id: x.id,
        quantity: x.quantity
      })).sort((a, b) => a.id - b.id)
    }))
  )

  const add = (id, n = 1, selections = null) => {
    const newLineKey = selections ? selectionKey(selections) : null

    setCart(current => {
      const existingIndex = current.findIndex(item => {
        if (item.id !== id) return false
        if (!selections) return !item.packSelections
        return selectionKey(item.packSelections || []) === newLineKey
      })

      if (existingIndex === -1) {
        return [...current, {
          id,
          qty: n,
          ...(selections ? { packSelections: selections } : {})
        }]
      }

      return current.map((item, index) => index === existingIndex
        ? { ...item, qty: item.qty + n }
        : item
      )
    })

    setProd(null)
    setQty(1)
    setPackSelections({})
    setPackError('')
  }

  const openProduct = p => {
    setProd(p)
    setQty(1)
    setPackError('')
    if (isPack(p)) resetPackSelection(p)
    else setPackSelections({})
  }

  const addProduct = () => {
    if (!prod || !prod.available) return
    if (!isPack(prod)) {
      add(prod.id, qty)
      return
    }

    const result = validatePack(prod)
    if (!result.valid) {
      setPackError(result.message)
      return
    }
    add(prod.id, qty, result.selections)
  }

  const chg = (line, n) => setCart(current => current.map(item =>
    item.id === line.item.id &&
    selectionKey(item.packSelections || []) === selectionKey(line.item.packSelections || [])
      ? { ...item, qty: Math.max(1, item.qty + n) }
      : item
  ))

  const rm = line => setCart(current => current.filter(item => item !== line.item))
  const toggleDelivery = checked => setDelivery(checked)

  // Guarda el pedido en la base de datos antes de abrir WhatsApp.
  const wa = async () => {
    if (sendingOrder) return

    const name = customerName.trim()
    const phone = customerPhone.trim()
    const digits = phone.replace(/\D/g, '')

    if (name.length < 2) {
      setOrderError('Ingresá tu nombre para continuar.')
      return
    }

    if (digits.length < 7 || digits.length > 15) {
      setOrderError('Ingresá un teléfono válido.')
      return
    }

    if (!s.whatsapp_number || !lines.length) {
      setOrderError('No se puede procesar este pedido.')
      return
    }

    setOrderError('')
    setSendingOrder(true)

    // Abrir la pestaña durante el clic para evitar que el navegador la bloquee.
    const popup = window.open('about:blank', '_blank')

    try {
      const payload = {
        customer_name: name,
        customer_phone: phone,
        delivery,
        items: lines.map(line => ({
          id: line.p.id,
          qty: line.qty,
          packSelections: line.item.packSelections || []
        }))
      }

      const result = await api.post('/orders', payload)
      const order = result.order

      if (!order?.id) {
        throw new Error('El pedido no se guardó correctamente.')
      }

      const textLines = [
        `🧾 Pedido #${order.id}`,
        `👤 Cliente: ${order.customer_name}`,
        `📞 Teléfono: ${order.customer_phone}`,
        ''
      ]

      for (const item of order.items) {
        textLines.push(`• ${item.name} x${item.quantity} — ${money(item.line_total)}`)

        if (item.packSelections?.length) {
          for (const option of item.packSelections) {
            const values = (option.selections || []).map(selected =>
              selected.quantity > 1
                ? `${selected.name} x${selected.quantity}`
                : selected.name
            ).join(', ')

            if (values) textLines.push(`   ${option.optionName}: ${values}`)
          }
        }
      }

      if (order.delivery) {
        textLines.push(
          '',
          `🚚 Envío a domicilio: ${money(order.delivery_cost)}`,
          '📍 La dirección se coordina por WhatsApp.'
        )
      }

      if (order.notes) textLines.push('', `Notas: ${order.notes}`)

      textLines.push(
        '',
        `Subtotal: ${money(order.subtotal)}`,
        `Envío: ${money(order.delivery_cost)}`,
        `Total: ${money(order.total)}`
      )

      const message = `${s.whatsapp_message || 'Hola! Quiero hacer este pedido:'}\n\n${textLines.join('\n')}`
      const url = `https://wa.me/${s.whatsapp_number}?text=${encodeURIComponent(message)}`

      if (popup && !popup.closed) {
        popup.location.href = url
      } else {
        window.location.href = url
      }
    } catch (error) {
      if (popup && !popup.closed) popup.close()
      setOrderError(error.message || 'No se pudo guardar el pedido. Intentá nuevamente.')
    } finally {
      setSendingOrder(false)
    }
  }

  const shown = d.products.filter(p => {
    const categoryMatch = !cat || p.category_id === cat
    const searchMatch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    return categoryMatch && searchMatch
  })

  const Card = ({ p }) => (
    <article className="card" onClick={() => openProduct(p)}>
      <div className="ph">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} loading="lazy" />
        ) : (
          <div className="product-placeholder">
            <Icon name="package" size={34} />
            <span>{s.business_name}</span>
          </div>
        )}

        {p.featured && <b className="tag featured"><Icon name="flame" size={13} />Destacado</b>}

        {isPack(p) && p.available && (
          <b className="tag" style={{
            top: p.featured ? '42px' : '12px',
            left: '12px',
            right: 'auto',
            background: '#bd1724',
            color: '#fff'
          }}>
            <Icon name="package" size={13} />Pack
          </b>
        )}

        {!p.available && <b className="tag out"><Icon name="alert" size={13} />Agotado</b>}

        {p.available && <div className="image-overlay"><span>Ver producto<Icon name="arrow" size={15} /></span></div>}
      </div>

      <div className="cb">
        <div className="product-category">{d.categories.find(c => c.id === p.category_id)?.name}</div>
        <h3>{p.name}</h3>
        {p.description && <p className="desc">{p.description}</p>}

        <div className="product-bottom">
          <strong className="price">{money(p.price)}</strong>
          {p.available ? (
            <button className="add-btn" onClick={e => {
              e.stopPropagation()
              openProduct(p)
            }}>
              <Icon name={isPack(p) ? 'package' : 'plus'} size={17} />
              {isPack(p) ? 'Elegir pack' : 'Agregar'}
            </button>
          ) : <span className="soldout">Agotado</span>}
        </div>
      </div>
    </article>
  )

  const PackSelector = ({ product }) => {
    const options = normalizePackOptions(product)

    if (!options.length) {
      return (
        <div style={{
          marginTop: '22px',
          padding: '16px',
          borderRadius: '14px',
          background: '#f6f6f6',
          border: '1px solid #e7e7e7'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontWeight: 600 }}>
            <Icon name="package" size={18} />
            Este pack no tiene opciones configuradas.
          </div>
        </div>
      )
    }

    return (
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <span className="section-label" style={{ display: 'block', marginBottom: '5px' }}>Personalizá tu pack</span>
          <p style={{ margin: 0, color: '#777', fontSize: '14px' }}>Elegí los productos que querés incluir.</p>
        </div>

        {options.map(option => {
          const category = d.categories.find(c => c.id === Number(option.category_id))
          const available = availableProductsForOption(option)
          const selected = getOptionSelections(option.id)
          const selectedCount = optionSelectedCount(option.id)
          const requiredQuantity = Number(option.quantity) || 1

          return (
            <div key={option.id} style={{
              border: '1px solid #e7e7e7',
              borderRadius: '16px',
              padding: '15px',
              background: '#fff'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '13px'
              }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '15px' }}>{option.name}</strong>
                  <small style={{ display: 'block', marginTop: '4px', color: '#888' }}>
                    {category?.name || 'Categoría'} · {requiredQuantity === 1 ? 'Elegí 1' : `Elegí ${requiredQuantity}`}
                    {!option.required && ' · Opcional'}
                  </small>
                </div>

                <span style={{
                  minWidth: '28px',
                  height: '28px',
                  padding: '0 8px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: selectedCount === requiredQuantity ? '#bd1724' : '#f1f1f1',
                  color: selectedCount === requiredQuantity ? '#fff' : '#555',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {selectedCount}/{requiredQuantity}
                </span>
              </div>

              {!available.length ? (
                <div style={{
                  padding: '13px',
                  borderRadius: '11px',
                  background: '#fafafa',
                  color: '#888',
                  fontSize: '13px'
                }}>
                  No hay productos disponibles en esta categoría.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {available.map(product => {
                    const productQty = Number(selected[product.id] || 0)

                    return (
                      <div key={product.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px',
                        borderRadius: '12px',
                        border: productQty > 0 ? '1px solid #bd1724' : '1px solid #ededed',
                        background: productQty > 0 ? '#fff7f7' : '#fff'
                      }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#f3f3f3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }} />
                          ) : <Icon name="package" size={19} />}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: '14px' }}>{product.name}</strong>
                          {product.description && (
                            <small style={{
                              display: 'block',
                              marginTop: '3px',
                              color: '#888',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>{product.description}</small>
                          )}
                        </div>

                        <div className="qty small">
                          <button type="button" disabled={productQty <= 0} onClick={() => changePackSelection(option, product.id, -1)}>
                            <Icon name="minus" size={13} />
                          </button>
                          <span>{productQty}</span>
                          <button type="button" disabled={selectedCount >= requiredQuantity && productQty <= 0} onClick={() => changePackSelection(option, product.id, 1)}>
                            <Icon name="plus" size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {packError && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: '#fff1f1',
            color: '#bd1724',
            fontSize: '13px',
            fontWeight: 600
          }}>
            <Icon name="alert" size={17} />
            {packError}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="store">
      <header className="top">
        <a href="/" className="brand">
          {s.logo_url ? <img src={s.logo_url} alt={s.business_name} /> : <span className="brand-mark">N</span>}
          <span>{s.business_name}</span>
        </a>

        <div className="top-actions">
          <button className="cartbtn" onClick={() => setOpen(true)} aria-label="Abrir carrito">
            <Icon name="cart" size={21} />
            <span className="cart-label">Carrito</span>
            {count > 0 && <i>{count}</i>}
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow"><span />Tu experiencia empieza acá</div>
          <h1>{s.welcome_text || s.business_name}</h1>
          {s.hero_text && <p>{s.hero_text}</p>}

          <div className="hero-actions">
            <a href="#catalogo" className="hero-btn">Ver catálogo<Icon name="arrow" size={18} /></a>
            {s.whatsapp_number && (
              <a href={`https://wa.me/${s.whatsapp_number}`} target="_blank" rel="noreferrer" className="hero-whatsapp">
                <Icon name="whatsapp" size={18} />WhatsApp
              </a>
            )}
          </div>
        </div>
        <Hookah />
        <div className="hero-glow" />
      </section>

      <section className="catalog-head" id="catalogo">
        <div>
          <span className="section-label">Nuestra selección</span>
          <h2>Encontrá lo que buscás</h2>
        </div>

        <div className="search-box">
          <Icon name="search" size={18} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." />
        </div>
      </section>

      <nav className="cats">
        <button className={!cat ? 'on' : ''} onClick={() => setCat(0)}>
          <span className="cat-icon"><Icon name="spark" size={16} /></span>
          Todo
        </button>
        {d.categories.map(c => (
          <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>
            {c.name}
          </button>
        ))}
      </nav>

      <main className="catalog">
        {shown.length ? (
          <div className="grid">
            {shown.map(p => <Card key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="empty-products">
            <div><Icon name="search" size={30} /></div>
            <h3>No encontramos productos</h3>
            <p>Probá con otra búsqueda o categoría.</p>
          </div>
        )}
      </main>

      <footer className="foot">
        <div className="footer-inner">
          <div className="footer-brand">
            {s.logo_url ? <img src={s.logo_url} alt={s.business_name} /> : <span className="brand-mark">N</span>}
            <div>
              <strong>{s.business_name}</strong>
              <p>Tu próxima experiencia.</p>
            </div>
          </div>

          <div className="footer-info">
            {s.opening_hours && (
              <div><Icon name="clock" size={18} /><span>{s.opening_hours}</span></div>
            )}
            {s.instagram && (
              <a href={`https://instagram.com/${s.instagram.replace('@', '')}`} target="_blank" rel="noreferrer">
                <Icon name="instagram" size={18} />
                <span>@{s.instagram.replace('@', '')}</span>
              </a>
            )}
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {s.business_name}</span>
          <span>Hecho para disfrutar.</span>
        </div>
      </footer>

      {count > 0 && !open && (
        <button className="fab" onClick={() => setOpen(true)}>
          <span className="fab-icon"><Icon name="cart" size={20} /></span>
          <span className="fab-info">
            <small>{count} {count === 1 ? 'producto' : 'productos'}</small>
            <strong>Ver carrito</strong>
          </span>
          <strong className="fab-total">{money(total)}</strong>
          <Icon name="arrow" size={19} />
        </button>
      )}

      {prod && (
        <div className="ov" onClick={() => setProd(null)}>
          <div className="sheet product-modal" onClick={e => e.stopPropagation()}>
            <button className="x" onClick={() => setProd(null)} aria-label="Cerrar"><Icon name="x" size={19} /></button>

            {prod.image_url && (
              <div className="modal-image">
                <img src={prod.image_url} alt={prod.name} />
                {prod.featured && <span><Icon name="flame" size={14} />Destacado</span>}
              </div>
            )}

            <div className="modal-content">
              <div className="modal-category">{d.categories.find(c => c.id === prod.category_id)?.name}</div>
              <h2>{prod.name}</h2>
              <strong className="modal-price">{money(prod.price)}</strong>
              {prod.description && <p className="modal-description">{prod.description}</p>}

              <div className={prod.available ? 'availability available' : 'availability unavailable'}>
                <Icon name={prod.available ? 'check' : 'alert'} size={16} />
                {prod.available ? 'Disponible' : 'Agotado'}
              </div>

              {prod.available && isPack(prod) && <PackSelector product={prod} />}

              {prod.available && (
                <div className="modal-buy" style={isPack(prod) ? { marginTop: '20px' } : undefined}>
                  {!isPack(prod) && (
                    <div className="qty">
                      <button onClick={() => setQty(Math.max(1, qty - 1))}><Icon name="minus" size={17} /></button>
                      <span>{qty}</span>
                      <button onClick={() => setQty(qty + 1)}><Icon name="plus" size={17} /></button>
                    </div>
                  )}

                  {isPack(prod) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px', color: '#777', fontSize: '13px' }}>
                      <Icon name="package" size={17} />Pack x{qty}
                    </div>
                  )}

                  <button className="btn red grow" onClick={addProduct}>
                    <Icon name="cart" size={18} />
                    {isPack(prod) ? 'Agregar pack' : 'Agregar al carrito'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="ov" onClick={() => setOpen(false)}>
          <aside className="sheet cart" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <div>
                <span className="section-label">Tu pedido</span>
                <h2>Carrito</h2>
              </div>
              <button className="x" onClick={() => setOpen(false)} aria-label="Cerrar carrito"><Icon name="x" size={19} /></button>
            </div>

            {!lines.length ? (
              <div className="empty-cart">
                <div className="empty-cart-icon"><Icon name="cart" size={34} /></div>
                <h3>Tu carrito está vacío</h3>
                <p>Agregá productos para comenzar tu pedido.</p>
                <button className="btn red" onClick={() => setOpen(false)}>Ver productos</button>
              </div>
            ) : (
              <>
                <div className="cart-lines">
                  {lines.map(line => {
                    const { p, qty: lineQty, item } = line

                    return (
                      <div className="line" key={`${p.id}-${selectionKey(item.packSelections || [])}`}>
                        <div className="line-image">
                          {p.image_url ? <img src={p.image_url} alt={p.name} /> : <Icon name="package" size={20} />}
                        </div>

                        <div className="line-info">
                          <b>{p.name}</b>
                          <small>{money(p.price)} c/u</small>

                          {isPack(p) && item.packSelections?.map(option => {
                            const values = option.selections.map(selected =>
                              selected.quantity > 1 ? `${selected.name} x${selected.quantity}` : selected.name
                            ).join(', ')

                            if (!values) return null

                            return (
                              <small key={option.optionId} style={{ display: 'block', marginTop: '3px', lineHeight: '1.35', color: '#777' }}>
                                <b>{option.optionName}:</b> {values}
                              </small>
                            )
                          })}

                          <div className="qty small">
                            <button onClick={() => chg(line, -1)}><Icon name="minus" size={13} /></button>
                            <span>{lineQty}</span>
                            <button onClick={() => chg(line, 1)}><Icon name="plus" size={13} /></button>
                          </div>
                        </div>

                        <div className="line-end">
                          <strong>{money(p.price * lineQty)}</strong>
                          <button className="x2" onClick={() => rm(line)} aria-label="Eliminar"><Icon name="trash" size={17} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ENVÍO */}
                <div className="delivery-box">
                  <label className="delivery-toggle">
                    <span className="delivery-toggle-left">
                      <span className="delivery-icon"><Icon name="location" size={20} /></span>
                      <span className="delivery-text">
                        <strong>Envío a domicilio</strong>
                        <small>Recibí tu pedido donde estés</small>
                      </span>
                    </span>

                    <span className="delivery-price">$30</span>
                    <input type="checkbox" checked={delivery} onChange={e => toggleDelivery(e.target.checked)} />
                    <span className="delivery-switch" />
                  </label>

                  {delivery && (
                    <div className="delivery-location">
                      <div className="delivery-location-info">
                        <Icon name="whatsapp" size={18} />
                        <span>Coordinamos la dirección de entrega por WhatsApp al confirmar el pedido.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* DATOS DEL CLIENTE */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px',
                  marginTop: '16px',
                  border: '1px solid #e7e7e7',
                  borderRadius: '14px'
                }}>
                  <strong>Datos para tu pedido</strong>

                  <label className="f">
                    <span>Tu nombre</span>
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Nombre y apellido"
                      maxLength={100}
                      value={customerName}
                      onChange={e => {
                        setCustomerName(e.target.value)
                        setOrderError('')
                      }}
                    />
                  </label>

                  <label className="f">
                    <span>Tu teléfono</span>
                    <input
                      type="tel"
                      autoComplete="tel"
                      placeholder="Ej: 099123456"
                      maxLength={25}
                      value={customerPhone}
                      onChange={e => {
                        setCustomerPhone(e.target.value)
                        setOrderError('')
                      }}
                    />
                  </label>

                  {orderError && (
                    <p role="alert" style={{ margin: 0, color: '#bd1724', fontSize: '13px' }}>
                      {orderError}
                    </p>
                  )}
                </div>

                {/* RESUMEN */}
                <div className="cart-summary">
                  <div className="row tot">
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>

                  <div className="row tot delivery-summary-row">
                    <span>Envío</span>
                    <span className={delivery ? 'delivery-summary-price' : ''}>
                      {delivery ? money(deliveryCost) : '—'}
                    </span>
                  </div>

                  <div className="row tot big">
                    <span>Total</span>
                    <span className="price">{money(total)}</span>
                  </div>
                </div>

                <button
                  className="whatsapp-order"
                  disabled={!s.whatsapp_number || !lines.length || sendingOrder}
                  onClick={wa}
                >
                  <Icon name="whatsapp" size={20} />
                  <span>
                    <small>{sendingOrder ? 'Guardando pedido…' : 'Finalizar pedido'}</small>
                    <strong>{sendingOrder ? 'Un momento, por favor' : 'Pedir por WhatsApp'}</strong>
                  </span>
                  <Icon name="arrow" size={18} />
                </button>

                <button className="link" disabled={sendingOrder} onClick={() => {
                  setCart([])
                  setDelivery(false)
                  setOrderError('')
                }}>
                  Vaciar carrito
                </button>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
