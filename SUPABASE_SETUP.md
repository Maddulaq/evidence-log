# Supabase setup — SOP & Proof Hub

This repository currently contains a device-local app. These files prepare a private cloud foundation; they do not switch the live app to cloud storage by themselves.

## 1. Apply the database setup

1. Open your Supabase project: https://supabase.com/dashboard/project/rihobudcchrgwithvutx
2. Open **SQL Editor** and create a new query.
3. Copy all of `supabase/schema.sql`, paste it, and run it.
4. Open **Storage** and confirm that `incident-evidence` exists and is marked **Private**.

The SQL creates profiles, incidents, an audit trail for incident changes, row-level security, and a private evidence bucket. Members can read/write only their own incident rows and evidence. The workspace admin can read all incidents and evidence. The admin role cannot be assigned by a normal member through the app.

## 2. Create the first administrator

1. In **Authentication → Providers**, enable Email authentication.
2. Temporarily allow sign-up for your own account only.
3. Sign up through the app after the cloud login screen is implemented, or create your user in **Authentication → Users**.
4. In SQL Editor, replace the placeholder email and run:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_LOGIN_EMAIL');
```

5. Verify exactly one row was updated. Keep your account as the sole admin.

## 3. Invite colleagues

Use **Authentication → Users → Invite user** in the Supabase dashboard. Colleague profiles are automatically created with the `member` role. Do not promote colleagues to admin.

## 4. Browser connection settings

The project URL and Supabase publishable key are intended for browser-side use. They are not passwords, but the publishable key is not an access-control mechanism: the RLS policies above are essential. Never place a database password, service-role key, or secret key in the public GitHub repository or browser code.

## 5. Important migration warning

The current live app stores records and base64 images in each browser's IndexedDB. This schema does not automatically copy those records to Supabase. Before cloud mode is enabled, the app needs a tested migration/export-import path that uploads each user's evidence into their own private storage folder and preserves original incident dates, order IDs, and image attachments. Keep the existing local app and backups until migration has been verified.

## 6. Security and rollout checklist

- Confirm RLS is enabled on all three public tables.
- Test with two member accounts: each must be unable to read, update, or delete the other's incident records or evidence.
- Test the admin account: it can read all incidents and evidence.
- Confirm the evidence bucket remains private; use short-lived signed URLs for viewing files.
- Disable public self-registration after initial admin setup.
- Do not use real customer-sensitive screenshots during testing.
- Take a Supabase backup/export before production rollout.

**Status:** schema and setup guide only. Cloud login, app data sync, invitation UI, and legacy migration are not yet connected to the production app.
