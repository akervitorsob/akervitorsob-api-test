# SQLite → Turso data migration (বাংলা নির্দেশনা)

**গুরুত্বপূর্ণ:** প্রথমে Turso-তে একটি নতুন, খালি database তৈরি করুন। এই script কোনো non-empty table-এ import করবে না।

## 1) Source SQLite ফাইল প্রস্তুত করুন

আপনার পুরোনো `akervitorsob-sqlite-backend-clean.zip` ফাইলটি আলাদা একটি folder-এ Extract করুন। `database` folder-এর ভিতরে এই তিনটি ফাইল একই সঙ্গে রাখুন:

- `akervitorsob.sqlite`
- `akervitorsob.sqlite-wal` (থাকলে)
- `akervitorsob.sqlite-shm` (থাকলে)

এই তিনটি ফাইল আলাদা করে সরাবেন না। ZIP-এ এগুলো একসঙ্গে ছিল।

## 2) Node.js install করুন

আপনার PC-তে Node.js 22 বা তার নতুন LTS version থাকতে হবে।

## 3) Turso credentials দিন

এই backend folder-এ `.env` নামে local file তৈরি করুন (GitHub-এ upload করবেন না), এবং যোগ করুন:

```env
TURSO_DATABASE_URL=libsql://YOUR_DATABASE_URL
TURSO_AUTH_TOKEN=YOUR_TURSO_TOKEN
SQLITE_SOURCE_PATH=C:/full/path/to/old-backend/database/akervitorsob.sqlite
```

Windows path-এ forward slash `/` ব্যবহার করতে পারেন।

## 4) Import চালান

এই backend folder-এ PowerShell খুলে:

```powershell
npm install
npm run migrate:sqlite
```

Script প্রথমে SQLite integrity পরীক্ষা করে। Turso-এর target tables-এ আগে থেকেই data থাকলে import থামিয়ে দেয়। সব table এক transaction-এ import করে।

## 5) সফলতার পর

Render-এ deploy করার সময় SQLite database file, `.env`, `node_modules`, বা private keys GitHub-এ upload করবেন না।

Turso-এর URL এবং token Render-এর Environment Variables-এ আলাদাভাবে দিন।

**যদি import error আসে, script আবার চালানোর আগে error দেখান। Target Turso database-এর data মুছে ফেলবেন না।**
