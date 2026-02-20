# Database Setup Script for Terraform Industries Simulation
# This script sets up the PostgreSQL database with all required tables
# Run this once after starting Docker or if you see "relation does not exist" errors

Write-Host "Setting up database schema..." -ForegroundColor Green
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"

# Check if Docker container is running
$containerRunning = docker ps --filter "name=tsinghua-sem-db" --format "{{.Names}}"

if (-not $containerRunning) {
    Write-Host "Error: Docker container 'tsinghua-sem-db' is not running!" -ForegroundColor Red
    Write-Host "Please start it with: docker-compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Docker container is running" -ForegroundColor Green

# Run schema SQL
Write-Host "Creating database tables..." -ForegroundColor Yellow
$schemaPath = Join-Path $backendPath "src\database\schema.sql"
Get-Content $schemaPath | docker exec -i tsinghua-sem-db psql -U sim_user -d simulation_db

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error creating schema!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Base schema created" -ForegroundColor Green

# Run Act tables migration
Write-Host "Creating Act tables..." -ForegroundColor Yellow
$actTablesPath = Join-Path $backendPath "src\database\migrations\add_act_tables.sql"
Get-Content $actTablesPath | docker exec -i tsinghua-sem-db psql -U sim_user -d simulation_db

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error creating Act tables!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Act tables created" -ForegroundColor Green

# Run mode column migration for simulation_sessions if it exists
$modeMigrationPath = Join-Path $backendPath "src\database\migrations\add_mode_to_simulation_sessions.sql"
if (Test-Path $modeMigrationPath) {
    Write-Host "Adding mode column to simulation_sessions..." -ForegroundColor Yellow
    Get-Content $modeMigrationPath | docker exec -i tsinghua-sem-db psql -U sim_user -d simulation_db
    Write-Host "✓ Mode column added to simulation_sessions" -ForegroundColor Green
}

# Run mode column migration for participants if it exists
$participantModeMigrationPath = Join-Path $backendPath "src\database\migrations\add_mode_to_participants.sql"
if (Test-Path $participantModeMigrationPath) {
    Write-Host "Adding mode column to participants..." -ForegroundColor Yellow
    Get-Content $participantModeMigrationPath | docker exec -i tsinghua-sem-db psql -U sim_user -d simulation_db
    Write-Host "✓ Mode column added to participants" -ForegroundColor Green
}

# Run comprehensive participants schema fix (adds all missing columns)
Write-Host "Fixing participants schema (adding missing columns)..." -ForegroundColor Yellow
$participantsFixPath = Join-Path $backendPath "src\database\migrations\fix_participants_schema.sql"
if (Test-Path $participantsFixPath) {
    Get-Content $participantsFixPath | docker exec -i tsinghua-sem-db psql -U sim_user -d simulation_db
    Write-Host "✓ participants schema fixed" -ForegroundColor Green
} else {
    Write-Host "Warning: participants schema fix migration not found" -ForegroundColor Yellow
}

# Run participant_id migration for decision_events
Write-Host "Ensuring participant_id column exists in decision_events..." -ForegroundColor Yellow
$participantIdMigrationPath = Join-Path $backendPath "src\database\migrations\add_participant_id_to_decision_events.sql"
if (Test-Path $participantIdMigrationPath) {
    Get-Content $participantIdMigrationPath | docker exec -i tsinghua-sem-db psql -U sim_user -d simulation_db | Out-Null
    Write-Host "✓ participant_id column verified/added" -ForegroundColor Green
} else {
    Write-Host "Warning: participant_id migration file not found" -ForegroundColor Yellow
}

# Run comprehensive decision_events schema fix
Write-Host "Fixing decision_events schema (adding missing columns)..." -ForegroundColor Yellow
$decisionEventsFixPath = Join-Path $backendPath "src\database\migrations\fix_decision_events_schema.sql"
if (Test-Path $decisionEventsFixPath) {
    Get-Content $decisionEventsFixPath | docker exec -i tsinghua-sem-db psql -U sim_user -d simulation_db
    Write-Host "✓ decision_events schema fixed" -ForegroundColor Green
} else {
    Write-Host "Warning: decision_events schema fix migration not found" -ForegroundColor Yellow
}

# Run research logging migration (creates event_logs, memos, chat_logs, ratings, computed_scores)
Write-Host "Creating research logging tables..." -ForegroundColor Yellow
$researchLoggingPath = Join-Path $backendPath "src\database\migrations\add_research_logging.sql"
if (Test-Path $researchLoggingPath) {
    Get-Content $researchLoggingPath | docker exec -i tsinghua-sem-db psql -U sim_user -d simulation_db
    Write-Host "✓ Research logging tables created" -ForegroundColor Green
} else {
    Write-Host "Warning: research logging migration not found" -ForegroundColor Yellow
}

# Run schema verification
Write-Host "Verifying database schemas..." -ForegroundColor Yellow
$verifySchemasPath = Join-Path $backendPath "src\database\migrations\verify_all_schemas.sql"
if (Test-Path $verifySchemasPath) {
    Get-Content $verifySchemasPath | docker exec -i tsinghua-sem-db psql -U sim_user -d simulation_db
    Write-Host "✓ Schema verification complete" -ForegroundColor Green
} else {
    Write-Host "Warning: Schema verification script not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Database setup complete! ✓" -ForegroundColor Green
Write-Host ""
Write-Host "You can now start the backend server with:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White