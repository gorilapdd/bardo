create table if not exists users(
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  role text not null default 'admin',
  created_at timestamptz default now()
);

create table if not exists categories(
  id serial primary key,
  name text not null,
  image_url text,
  active boolean default true,
  sort_order int default 0,
  is_test boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists products(
  id serial primary key,
  name text not null,
  description text default '',
  price numeric(10,2) not null check(price>=0),
  image_url text,
  category_id int references categories(id) on delete restrict,
  available boolean default true,
  featured boolean default false,
  sort_order int default 0,
  is_test boolean default false,

  -- normal = producto común
  -- pack   = producto que puede tener opciones configurables
  product_type text not null default 'normal'
    check(product_type in ('normal','pack')),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists pack_options(
  id serial primary key,

  -- Pack al que pertenece esta opción
  product_id int not null
    references products(id)
    on delete cascade,

  -- Texto que verá el cliente
  name text not null,

  -- Los productos disponibles para elegir salen de esta categoría
  category_id int not null
    references categories(id)
    on delete restrict,

  -- Cuántos productos debe elegir el cliente
  quantity int not null default 1
    check(quantity > 0),

  -- Si es obligatorio elegir esta opción
  required boolean not null default true,

  -- Orden en el que aparece en el modal
  sort_order int not null default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists settings(
  id int primary key default 1 check(id=1),
  business_name text default 'Mi Negocio',
  logo_url text,
  whatsapp_number text default '',
  instagram text default '',
  welcome_text text default '',
  hero_text text default '',
  opening_hours text default '',
  whatsapp_message text default 'Hola! Quiero hacer este pedido:'
);

insert into settings(id)
values(1)
on conflict do nothing;


-- =========================================================
-- COMPATIBILIDAD CON UNA BASE YA EXISTENTE
-- =========================================================

-- Si la tabla products ya existía antes de agregar los packs,
-- agregamos la nueva columna sin borrar ningún producto.
alter table products
add column if not exists product_type text
default 'normal';

-- Aseguramos que los productos existentes sean normales.
update products
set product_type = 'normal'
where product_type is null;

-- La restricción se agrega solamente si todavía no existe.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_product_type_check'
  ) then
    alter table products
    add constraint products_product_type_check
    check(product_type in ('normal','pack'));
  end if;
end $$;
