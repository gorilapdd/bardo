import 'dotenv/config';import pg from 'pg';
export const db=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:false}:undefined});
export const q=(s,p)=>db.query(s,p).then(r=>r.rows);
