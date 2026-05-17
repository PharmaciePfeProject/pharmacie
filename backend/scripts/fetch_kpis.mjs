import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { buildAccessFromRoleIds } from '../src/utils/rbac.js';

async function main(){
  try{
    const access = buildAccessFromRoleIds([1]);
    const token = jwt.sign({ sub: 1640479, email: 'admin@gmail.com', username: 'admin', functionName: null, roleIds: access.roleIds, roles: access.roles, permissions: access.permissions }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const endpoints = [
      '/api/kpis',
      '/api/kpis/stock',
      '/api/kpis/prescriptions',
      '/api/kpis/distributions',
      '/api/kpis/reporting',
    ];

    for (const endpoint of endpoints) {
      const res = await fetch(`http://localhost:4000${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(endpoint, 'status', res.status);
      const j = await res.json().catch(() => null);
      console.log(JSON.stringify(j, null, 2));
    }
  }catch(err){
    console.error(err);
    process.exit(1);
  }
}

main();
