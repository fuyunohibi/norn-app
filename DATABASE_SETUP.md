# Database Setup Guide for NORN App

## 🚀 Quick Start

### 1. Run Database Migration

```bash
# Run the migration script to get the SQL schema
node scripts/migrate-database.js
```

### 2. Apply Schema to Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the SQL schema from the migration script output
4. Paste and run the schema

### 2b. Apply Service Role Policies (Required for Backend)

**Option A: Fresh Start (Recommended if you have RLS issues)**

If you're experiencing RLS policy violations, the easiest solution is to recreate the tables with proper policies:

1. Go to **SQL Editor** in Supabase
2. Run the migration: `mobile/supabase/migrations/20250910_000005_recreate_tables_with_rls.sql`
   - This will drop and recreate all sensor-related tables (keeps `users` and `user_preferences`)
   - Sets up RLS with permissive INSERT policies for backend service_role
   - All tables will be recreated with correct schema and indexes

**Option B: Fix Existing Tables**

If you want to keep existing data, run:
- `mobile/supabase/migrations/20250910_000004_fix_rls_policies.sql`

**Important:** The backend uses `service_role` key which should bypass RLS, but the permissive policies ensure inserts work even if RLS is enforced.

### 3. Verify Setup

The migration will create:
- ✅ All required tables (`users`, `sensor_devices`, `sensor_configurations`, etc.)
- ✅ Row Level Security (RLS) policies
- ✅ Database indexes for performance
- ✅ Triggers for automatic user profile creation
- ✅ Database views for common queries

## 📋 Database Schema Overview

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles with username and full name |
| `sensor_devices` | C1001 device information and status |
| `sensor_configurations` | Device settings and emergency contacts |
| `sensor_readings` | Real-time sensor data (sleep, fall, movement) |
| `alerts` | System alerts and notifications |
| `monitoring_sessions` | Tracking monitoring sessions |
| `user_preferences` | User notification and backup settings |

### Key Features

- **Row Level Security**: All data is protected by user-specific policies
- **Automatic Triggers**: User profiles are created automatically on signup
- **Optimized Indexes**: Fast queries on common operations
- **Database Views**: Pre-built views for dashboard and device status

## 🔧 Environment Variables

Make sure your `.env` file has:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
```

## 🧪 Testing the Setup

### 1. Test Authentication
- Try signing up with a new account
- Check if user profile is created automatically
- Verify login works correctly

### 2. Test Database Connection
- Go to Settings page
- Check the "Database Status" section
- Should show "Database Connected" with green checkmark

### 3. Test User Profile
- After login, user profile should be created
- Check Supabase dashboard to see the new user record

## 🐛 Troubleshooting

### Common Issues

1. **"Table doesn't exist" errors**
   - Make sure you ran the complete SQL schema
   - Check if all tables were created in Supabase

2. **"Permission denied" errors**
   - Verify RLS policies are enabled
   - Check if user is properly authenticated

3. **"Foreign key constraint" errors**
   - Ensure tables are created in the correct order
   - Check if referenced tables exist

### Debug Steps

1. Check Supabase logs in the dashboard
2. Verify environment variables are correct
3. Test database connection in the app
4. Check browser console for errors

## 📊 Database Health Check

The app includes a built-in database health check component that:
- Tests database connectivity
- Shows connection status
- Provides error details if issues occur

## 🔄 Next Steps

After successful migration:

1. **Test Authentication Flow**
   - Sign up with a new account
   - Verify email confirmation works
   - Test login/logout functionality

2. **Test Database Operations**
   - Create a sensor device
   - Add sensor readings
   - Test alert creation

3. **Monitor Performance**
   - Check query performance in Supabase
   - Monitor database usage
   - Optimize if needed

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Indexing Best Practices](https://supabase.com/docs/guides/database/indexes)

---

**Need Help?** Check the troubleshooting section or review the Supabase logs for detailed error messages.
