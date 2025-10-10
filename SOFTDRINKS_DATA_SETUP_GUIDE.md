# 📋 Guide: How to Add Soft Drinks Test Data to Render Database

## 🎯 **What You Need:**
1. **pgAdmin** (PostgreSQL administration tool)
2. **Your Render database connection details**
3. **The SQL file:** `softdrinks_test_data_simple.sql`

## 🔧 **Step 1: Get Your Database Connection Details from Render**

1. **Go to your Render dashboard**
2. **Click on your database service** (not the web service)
3. **Go to "Info" tab**
4. **Copy these details:**
   - **Host:** (something like `dpg-xxxxx-a.oregon-postgres.render.com`)
   - **Port:** `5432`
   - **Database:** `stock_nexus`
   - **Username:** (your database user)
   - **Password:** (your database password)

## 🔧 **Step 2: Connect to Your Database with pgAdmin**

1. **Open pgAdmin**
2. **Right-click "Servers"** → **"Create"** → **"Server"**
3. **Fill in the connection details:**
   - **Name:** `Stock Nexus Render DB`
   - **Host:** Your Render database host
   - **Port:** `5432`
   - **Database:** `stock_nexus`
   - **Username:** Your Render database username
   - **Password:** Your Render database password
4. **Click "Save"**

## 🔧 **Step 3: Get Your Branch ID and User ID**

**Before running the SQL file, you need to get your actual IDs:**

1. **Right-click your database** → **"Query Tool"**
2. **Run this query to get your branch ID:**
   ```sql
   SELECT id, name FROM branches LIMIT 1;
   ```
3. **Copy the branch ID** (it looks like: `e3204bd8-ac3d-413f-bd7b-2727e9c7f598`)
4. **Run this query to get your user ID:**
   ```sql
   SELECT id FROM users WHERE is_active = true LIMIT 1;
   ```
5. **Copy the user ID** (it looks like: `3edce773-cadd-43f2-ad49-5dc72a2c80a4`)

## 🔧 **Step 4: Edit the SQL File**

1. **Open the file:** `softdrinks_test_data_simple.sql`
2. **Find and replace these placeholders:**
   - Replace `'YOUR_BRANCH_ID_HERE'` with your actual branch ID
   - Replace `'YOUR_USER_ID_HERE'` with your actual user ID
3. **Save the file**

## 🔧 **Step 5: Run the SQL File**

1. **In pgAdmin, right-click your database** → **"Query Tool"**
2. **Click the folder icon** to open a file
3. **Select:** `softdrinks_test_data_simple.sql`
4. **Click "Execute"** (or press F5)

## ✅ **Step 6: Verify the Data**

**Run this query to check if data was inserted:**
```sql
SELECT 'Items inserted:' as status, COUNT(*) as count FROM items WHERE category = 'softdrinks';
SELECT 'Stock movements inserted:' as status, COUNT(*) as count FROM stock_movements WHERE item_id IN (
    SELECT id FROM items WHERE category = 'softdrinks'
);
```

**You should see:**
- **Items inserted:** 8
- **Stock movements inserted:** 50+ (depending on how many movements were inserted)

## 🎯 **Step 7: Test Your Report**

1. **Go to your deployed app:** `https://stock-nexus-84-main-2-kmth.vercel.app`
2. **Navigate to Reports page**
3. **Select "Soft Drinks Weekly Comparison"**
4. **Choose analysis period:** 2, 4, 8, or 12 weeks
5. **View the results!**

## 📊 **What You'll See:**

### **Test Scenarios:**
1. **Coca Cola** - 📈 Positive trend (gaining inventory)
2. **Pepsi** - 📉 Negative trend (losing inventory)
3. **Sprite** - ➡️ Stable trend (balanced)
4. **Fanta** - ⚠️ Critical trend (high consumption)
5. **Mountain Dew** - 📈 Growing trend (bulk orders)
6. **Red Bull** - 🔄 Erratic pattern (irregular)
7. **Monster Energy** - 📅 Seasonal spike (weekend pattern)
8. **Gatorade** - 🏃 Sports season pattern

### **Expected Results:**
- **Summary cards** with totals
- **Strategic recommendations** for each trend
- **Weekly breakdown** with color-coded indicators
- **Item-specific advice** like "Increase order quantity" or "Maintain current ordering"

## 🚨 **Troubleshooting:**

**If you get errors:**
1. **Check your branch ID and user ID** are correct
2. **Make sure you're connected to the right database**
3. **Check if items already exist** (the script uses `ON CONFLICT DO NOTHING`)

**If you need to start over:**
```sql
-- Delete existing soft drinks data
DELETE FROM stock_movements WHERE item_id IN (
    SELECT id FROM items WHERE category = 'softdrinks'
);
DELETE FROM items WHERE category = 'softdrinks';
```

## 🎉 **Success!**

Once completed, you'll have comprehensive test data for your Soft Drinks Weekly Comparison Report with intelligent business advice and trend analysis!
