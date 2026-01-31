# Fix: "The query requires an index" (get_chat_history)

The chat history query filters by `session_id` and orders by `timestamp`. Firestore needs a **composite index** for that.

## Option 1: Create index via link (fastest)

1. Open this link (it opens Firebase Console with the index pre-filled for your project):
   **[Create messages index (qubit-32-b6cdf)](https://console.firebase.google.com/v1/r/project/qubit-32-b6cdf/firestore/indexes?create_composite=Ck9wcm9qZWN0cy9xdWJpdC0zMi1iNmNkZi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvbWVzc2FnZXMvaW5kZXhlcy9fEAEaDgoKc2Vzc2lvbl9pZBABGg0KCXRpbWVzdGFtcBABGgwKCF9fbmFtZV9fEAE)**
2. In Firebase Console, click **Create index**.
3. Wait a few minutes for the index to build. After that, chat history will load without this error.

## Option 2: Create index via Firebase Console manually

1. Open [Firebase Console](https://console.firebase.google.com) → your project **qubit-32-b6cdf**.
2. Go to **Firestore Database** → **Indexes** tab.
3. Click **Create index**.
4. Set:
   - **Collection ID:** `messages`
   - **Fields to index:**
     - `session_id` — Ascending
     - `timestamp` — Ascending
5. Click **Create**.

## Option 3: Deploy index with Firebase CLI

From the project root (where `firestore.indexes.json` is):

```bash
firebase deploy --only firestore:indexes
```

You need `firebase.json` with your project and Firestore configured. If you don’t have Firebase CLI set up, use Option 1 or 2.
