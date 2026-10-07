import bcrypt from 'bcryptjs';import fs from 'fs';import {db,q} from './db.js';
const cmd=process.argv[2];
if(cmd==='init')await db.query(fs.readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
if(cmd==='admin'){const{ADMIN_EMAIL:e,ADMIN_PASSWORD:p}=process.env;if(!e||!p||p.length<10)throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD (10+ caracteres) requeridos');
 await q(`insert into users(email,password_hash) values($1,$2) on conflict(email) do update set password_hash=excluded.password_hash`,[e.toLowerCase(),await bcrypt.hash(p,12)]);}
if(cmd==='demo'){ // DATOS DE PRUEBA ficticios (is_test=true). Borrar con: npm run clean
 let i=0;for(const n of['Tabacos','Carbones','Hojas','Accesorios','Packs','Otros']){const[c]=await q(`insert into categories(name,sort_order,is_test) values($1,$2,true) returning id`,[n,i++]);
 if(['Tabacos','Carbones','Hojas','Packs'].includes(n))await q(`insert into products(name,description,price,category_id,sort_order,is_test,featured) values($1,'Producto de prueba',100,$2,0,true,$3)`,[`[PRUEBA] ${n}`,c.id,n==='Packs'])}}
if(cmd==='clean'){await q('delete from products where is_test');await q('delete from categories c where is_test and not exists(select 1 from products p where p.category_id=c.id)')}
await db.end();console.log('ok',cmd);
