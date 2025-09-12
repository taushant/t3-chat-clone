# Database Inspection Guide - T3 Chat Clone

This guide shows you how to connect to and inspect the PostgreSQL database to see what data is created during testing.

## 🗄️ **Database Connection Methods**

### **Method 1: Using Prisma Studio (Recommended)**

Prisma Studio provides a visual interface to inspect your database:

```bash
# Navigate to the API directory
cd /Users/tausheetantani/projects/t3-chat-clone/apps/api

# Start Prisma Studio
npx prisma studio
```

**Expected Result**:

- Opens browser at `http://localhost:5555`
- Visual interface to browse all tables and data
- Can view, edit, and delete records

---

### **Method 2: Using psql Command Line**

#### **Step 1: Get Database Connection Info**

```bash
# From the API directory, check the environment file
cd /Users/tausheetantani/projects/t3-chat-clone/apps/api
cat .env | grep DATABASE_URL
```

#### **Step 2: Connect via psql**

```bash
# If DATABASE_URL is something like: postgresql://username:password@localhost:5432/dbname
# Extract the components and connect:

psql -h localhost -p 5432 -U your_username -d your_database_name

# OR use the full connection string:
psql "postgresql://username:password@localhost:5432/dbname"
```

#### **Step 3: Useful psql Commands**

```sql
-- List all tables
\dt

-- Describe a specific table structure
\d User
\d Chat
\d Message

-- View all users
SELECT * FROM "User";

-- View all chats
SELECT * FROM "Chat";

-- View all messages
SELECT * FROM "Message";

-- Count records in each table
SELECT 'Users' as table_name, COUNT(*) as record_count FROM "User"
UNION ALL
SELECT 'Chats', COUNT(*) FROM "Chat"
UNION ALL
SELECT 'Messages', COUNT(*) FROM "Message"
UNION ALL
SELECT 'ChatParticipants', COUNT(*) FROM "ChatParticipant";

-- Exit psql
\q
```

---

### **Method 3: Using a GUI Client**

#### **pgAdmin (Web-based)**

1. Install pgAdmin: `brew install --cask pgadmin4`
2. Launch pgAdmin
3. Create new server connection:
   - Host: `localhost`
   - Port: `5432`
   - Database: `your_database_name`
   - Username: `your_username`
   - Password: `your_password`

#### **DBeaver (Cross-platform)**

1. Download DBeaver: https://dbeaver.io/
2. Create new PostgreSQL connection
3. Use your database credentials

#### **TablePlus (macOS)**

1. Install TablePlus: `brew install --cask tableplus`
2. Create new PostgreSQL connection
3. Use your database credentials

---

### **Method 4: Using Prisma CLI**

```bash
# Navigate to API directory
cd /Users/tausheetantani/projects/t3-chat-clone/apps/api

# View database status
npx prisma db push --preview-feature

# Generate and view the current database schema
npx prisma db pull

# Reset database (⚠️ WARNING: This will delete all data)
npx prisma db push --force-reset
```

---

## 📊 **Database Schema Overview**

### **Core Tables**

#### **User Table**

```sql
SELECT id, email, username, "firstName", "lastName", role, "isActive", "createdAt"
FROM "User"
ORDER BY "createdAt" DESC;
```

#### **Chat Table**

```sql
SELECT id, name, type, description, "maxParticipants", "createdAt", "ownerId"
FROM "Chat"
ORDER BY "createdAt" DESC;
```

#### **Message Table**

```sql
SELECT id, content, type, "chatId", "authorId", "createdAt"
FROM "Message"
ORDER BY "createdAt" DESC;
```

#### **ChatParticipant Table**

```sql
SELECT cp.id, cp.role, cp."joinedAt",
       u.username, u.email,
       c.name as chat_name
FROM "ChatParticipant" cp
JOIN "User" u ON cp."userId" = u.id
JOIN "Chat" c ON cp."chatId" = c.id
ORDER BY cp."joinedAt" DESC;
```

---

## 🔍 **Testing Data Inspection Queries**

### **After User Registration**

```sql
-- Check if test user was created
SELECT id, email, username, role, "isActive", "createdAt"
FROM "User"
WHERE email = 'testuser@example.com';

-- Count total users
SELECT COUNT(*) as total_users FROM "User";
```

### **After Chat Creation**

```sql
-- View chats created during testing
SELECT c.id, c.name, c.type, c.description, c."createdAt",
       u.username as owner_username
FROM "Chat" c
JOIN "User" u ON c."ownerId" = u.id
WHERE c.name LIKE '%Test%' OR c.name LIKE '%E2E%'
ORDER BY c."createdAt" DESC;

-- Count total chats
SELECT COUNT(*) as total_chats FROM "Chat";
```

### **After Messaging**

```sql
-- View messages from testing
SELECT m.id, m.content, m.type, m."createdAt",
       u.username as author,
       c.name as chat_name
FROM "Message" m
JOIN "User" u ON m."authorId" = u.id
JOIN "Chat" c ON m."chatId" = c.id
WHERE m.content LIKE '%test%' OR m.content LIKE '%API%'
ORDER BY m."createdAt" DESC;

-- Count total messages
SELECT COUNT(*) as total_messages FROM "Message";
```

### **Chat Participants**

```sql
-- View who joined which chats
SELECT c.name as chat_name,
       u.username,
       cp.role,
       cp."joinedAt"
FROM "ChatParticipant" cp
JOIN "User" u ON cp."userId" = u.id
JOIN "Chat" c ON cp."chatId" = c.id
ORDER BY cp."joinedAt" DESC;
```

### **Audit Logs (Security)**

```sql
-- View security audit logs
SELECT al.id, al.action, al."entityType", al."entityId",
       al."userId", al."ipAddress", al."userAgent", al."createdAt"
FROM "AuditLog" al
ORDER BY al."createdAt" DESC
LIMIT 20;
```

### **Failed Login Attempts**

```sql
-- Check for failed login attempts
SELECT fla.id, fla.email, fla."ipAddress", fla."attemptedAt", fla."userAgent"
FROM "FailedLoginAttempt" fla
ORDER BY fla."attemptedAt" DESC;
```

---

## 📈 **Real-time Data Monitoring**

### **Continuous Monitoring Script**

Create a monitoring script to watch data changes:

```bash
# Create monitoring script
cat > monitor_db.sh << 'EOF'
#!/bin/bash

echo "=== T3 Chat Clone Database Monitor ==="
echo "Refreshing every 5 seconds... (Ctrl+C to stop)"
echo ""

while true; do
    clear
    echo "=== Database Statistics ($(date)) ==="
    echo ""

    psql "$DATABASE_URL" -c "
    SELECT 'Users' as table_name, COUNT(*) as records FROM \"User\"
    UNION ALL
    SELECT 'Chats', COUNT(*) FROM \"Chat\"
    UNION ALL
    SELECT 'Messages', COUNT(*) FROM \"Message\"
    UNION ALL
    SELECT 'Participants', COUNT(*) FROM \"ChatParticipant\"
    UNION ALL
    SELECT 'API Keys', COUNT(*) FROM \"ApiKey\"
    UNION ALL
    SELECT 'Audit Logs', COUNT(*) FROM \"AuditLog\";
    "

    echo ""
    echo "=== Recent Messages ==="
    psql "$DATABASE_URL" -c "
    SELECT SUBSTRING(m.content, 1, 50) as message_preview,
           u.username as author,
           c.name as chat,
           m.\"createdAt\"
    FROM \"Message\" m
    JOIN \"User\" u ON m.\"authorId\" = u.id
    JOIN \"Chat\" c ON m.\"chatId\" = c.id
    ORDER BY m.\"createdAt\" DESC
    LIMIT 5;
    "

    sleep 5
done
EOF

chmod +x monitor_db.sh
```

### **Run the Monitor**

```bash
# Set your database URL
export DATABASE_URL="your_database_connection_string"

# Run the monitor
./monitor_db.sh
```

---

## 🛠️ **Useful Database Maintenance**

### **Backup Database**

```bash
# Create backup
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql "$DATABASE_URL" < backup_file.sql
```

### **Reset Test Data**

```sql
-- ⚠️ WARNING: This will delete all data!
-- Delete in proper order due to foreign key constraints
DELETE FROM "Message";
DELETE FROM "ChatParticipant";
DELETE FROM "Chat";
DELETE FROM "FailedLoginAttempt";
DELETE FROM "PasswordResetToken";
DELETE FROM "ApiKey";
DELETE FROM "AuditLog";
DELETE FROM "User";

-- Reset sequences (if using serial IDs)
-- ALTER SEQUENCE "User_id_seq" RESTART WITH 1;
```

### **Performance Monitoring**

```sql
-- Check database size
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 🚀 **Quick Start Commands**

### **Open Prisma Studio (Easiest)**

```bash
cd /Users/tausheetantani/projects/t3-chat-clone/apps/api
npx prisma studio
# Opens http://localhost:5555
```

### **Quick Database Check**

```bash
# Check if database is accessible
cd /Users/tausheetantani/projects/t3-chat-clone/apps/api
npx prisma db seed --preview-feature
```

### **View Recent Activity**

```sql
-- Connect with psql and run:
SELECT
    'User' as table_name,
    COUNT(*) as records,
    MAX("createdAt") as latest_record
FROM "User"
UNION ALL
SELECT 'Chat', COUNT(*), MAX("createdAt") FROM "Chat"
UNION ALL
SELECT 'Message', COUNT(*), MAX("createdAt") FROM "Message";
```

---

## 📱 **Integration with Testing**

### **Before Running Tests**

1. **Backup current data** (if needed)
2. **Open Prisma Studio** for real-time viewing
3. **Start database monitor** script

### **During Testing**

1. **Watch Prisma Studio** for real-time data changes
2. **Monitor console logs** for database operations
3. **Check specific tables** after each test phase

### **After Testing**

1. **Verify all test data** is present
2. **Check data relationships** are correct
3. **Review audit logs** for security events
4. **Clean up test data** if needed

---

**Now you can inspect your database in real-time as you run the end-to-end tests!** 🎉
