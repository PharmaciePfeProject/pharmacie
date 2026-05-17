#!/bin/bash
# Script to run the agent table creation

echo "Creating AGENT table in the database..."
cd backend
npm exec node scripts/create_agent_table.mjs
echo "Done!"
