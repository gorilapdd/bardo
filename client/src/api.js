const r=async(u,m='GET',b)=>{const f=b instanceof FormData;const res=await fetch('/api'+u,{method:m,credentials:'include',headers:b&&!f?{'Content-Type':'application/json'}:{},body:b?(f?b:JSON.stringify(b)):undefined});
 const d=await res.json().catch(()=>({}));if(!res.ok)throw new Error(d.error||'Error');return d};
export const api={get:u=>r(u),post:(u,b)=>r(u,'POST',b),put:(u,b)=>r(u,'PUT',b),patch:(u,b)=>r(u,'PATCH',b),del:(u,b)=>r(u,'DELETE',b)};
export const money=n=>'$'+Number(n).toLocaleString('es-UY',{maximumFractionDigits:2});
