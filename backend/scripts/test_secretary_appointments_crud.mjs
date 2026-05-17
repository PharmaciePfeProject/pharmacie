import 'dotenv/config';

const API = process.env.API_BASE_URL || 'http://localhost:4000';
const credentials = {
  emailOrUsername: process.env.SECRETARY_EMAIL || 'secretaire.general@pharmacie.local',
  password: process.env.SECRETARY_PASSWORD || 'Secretaire@12345',
};

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { res, data };
}

async function main() {
  const login = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  console.log('login:', login.res.status, login.data?.user?.roles, login.data?.user?.permissions);
  if (!login.res.ok) process.exit(1);

  const token = login.data.token;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const resources = await api('/api/appointments/resources', { headers });
  console.log('resources:', resources.res.status, 'agents=', resources.data?.agents?.length ?? 0, 'doctors=', resources.data?.doctors?.length ?? 0);

  const agent = resources.data?.agents?.[0];
  const doctor = resources.data?.doctors?.[0];
  if (!agent || !doctor) {
    console.log('No agent/doctor available for CRUD test');
    process.exit(0);
  }

  const create = await api('/api/appointments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      doctor_id: doctor.doctor_id,
      doctor_name: doctor.doctor_name,
      date: '2026-05-20',
      time: '10:30',
      status: 'SCHEDULED',
      notes: 'CRUD secretary test',
    }),
  });
  const id = create.data?.item?.id;
  console.log('create:', create.res.status, 'id=', id);

  const list = await api('/api/appointments', { headers });
  console.log('list:', list.res.status, 'count=', list.data?.items?.length ?? 0);

  if (!id) process.exit(0);

  const update = await api(`/api/appointments/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ status: 'RESCHEDULED', notes: 'updated by CRUD test' }),
  });
  console.log('update:', update.res.status, update.data?.message || update.data?.item?.status || null);

  const del = await api(`/api/appointments/${id}`, {
    method: 'DELETE',
    headers,
  });
  console.log('delete:', del.res.status, del.data);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
