import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

export const db = new Pool({
connectionString: process.env.DATABASE_URL,
ssl:
process.env.DATABASE_SSL === 'true'
? { rejectUnauthorized: false }
: undefined
})

db.on('error', error => {
console.error('❌ ERROR DEL POOL POSTGRES:', error.message)
})

db.connect()
.then(client => {
console.log('✅ PostgreSQL conectado correctamente')
client.release()
})
.catch(error => {
console.error('❌ ERROR CONECTANDO A POSTGRESQL:')
console.error('Mensaje:', error.message)
console.error('Código:', error.code || 'sin código')
})

export const q = (sql, params) =>
db.query(sql, params).then(result => result.rows)
