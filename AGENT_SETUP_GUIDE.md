# How to Set Up the Agent Management System

## Prerequisites
- Node.js installed
- Backend and Frontend running
- Oracle database configured

## Step 1: Create the AGENT Table

### On Windows:
```bash
.\create-agent-table.bat
```

### On Linux/Mac:
```bash
bash create-agent-table.sh
```

### Or manually:
```bash
cd backend
npm exec node scripts/create_agent_table.mjs
```

You should see output like:
```
Creating AGENT table...
✓ Table AGENT created successfully
✓ Sequence AGENT_SEQ created successfully
```

## Step 2: Start the Application

### Backend:
```bash
cd backend
npm install  # if not already done
npm start
```

### Frontend (in another terminal):
```bash
cd frontend
npm install  # if not already done
npm run dev
```

## Step 3: Access Agent Management

1. Go to `http://localhost:5173` (or your frontend URL)
2. Log in with an admin account
3. Click on "Admin" in the dashboard
4. Click on "Agents" card
5. You should now see the Agent Management page

## Step 4: Create Agents

1. Fill in the "Add New Agent" form:
   - **Agent Name** (required): e.g., "Dr. Jean Dupont"
   - **Agent Situation** (optional): e.g., "Hospital Ward A, Service 1"
2. Click "Create Agent"
3. Your agent will appear in the list below

## Step 5: Using Agents in Prescriptions

1. Go to "Doctors" → "Prescriptions"
2. When creating a new prescription:
   - The agent dropdown will now be populated from the AGENT table
   - You can search and select agents you created
3. Select an agent and proceed with creating the prescription

## Step 6: Manage Agents

In the Admin Agents page, you can:
- **Search**: Use the search box to find agents by name or situation
- **Edit**: Click the edit icon (pencil) to modify an agent
- **Delete**: Click the delete icon (trash) to remove an agent

## Migrating Existing Agents

If you have existing agents in the PRESCRIPTION table, you can migrate them:

1. Connect to your Oracle database
2. Run this SQL:
```sql
INSERT INTO AGENT (ID, NAME, SITUATION, CREATED_AT, UPDATED_AT)
SELECT DISTINCT 
  AGENT_ID,
  AGENT_SITUATION,
  AGENT_SITUATION,
  SYSTIMESTAMP,
  SYSTIMESTAMP
FROM PRESCRIPTION
WHERE AGENT_ID IS NOT NULL;
COMMIT;
```

3. The system will now use the AGENT table for prescriptions

## API Endpoints

All endpoints require authentication. Available endpoints:

### GET /api/agents
Get all agents with pagination
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/agents?page=1&pageSize=20&search=doctor"
```

### GET /api/agents/:agent_id
Get a specific agent
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/agents/1"
```

### POST /api/agents
Create a new agent
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "Dr. Jean Dupont",
    "agent_situation": "Hospital Ward A"
  }' \
  "http://localhost:3000/api/agents"
```

### PUT /api/agents/:agent_id
Update an agent
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "Dr. John Doe",
    "agent_situation": "Hospital Ward B"
  }' \
  "http://localhost:3000/api/agents/1"
```

### DELETE /api/agents/:agent_id
Delete an agent
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/agents/1"
```

## Troubleshooting

### Agent table not found
- Make sure you ran the `create-agent-table.sh` or `create-agent-table.bat` script
- The system has a fallback mechanism that will try to use the PRESCRIPTION table if AGENT table doesn't exist

### Permission denied when accessing agents
- Make sure your user account has the `PRESCRIPTIONS_WRITE` permission
- Ask an admin to grant you the necessary permissions

### Agents not appearing in prescription form
- Make sure you have created at least one agent in the Admin panel
- Clear your browser cache (Ctrl+Shift+Del)
- Refresh the page (Ctrl+R)

## Support

For more information, see:
- [AGENT_IMPLEMENTATION.md](./AGENT_IMPLEMENTATION.md) - Technical implementation details
- [README.md](./README.md) - Project overview
