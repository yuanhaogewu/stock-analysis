import sqlite3

def check_db():
    try:
        conn = sqlite3.connect('backend/stock_system.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT config_key, config_value FROM system_config")
        configs = {row['config_key']: row['config_value'] for row in cursor.fetchall()}
        print("Configs:")
        for k, v in configs.items():
            if 'key' in k.lower():
                print(f"{k}: {'***' if v else 'EMPTY'}")
            else:
                print(f"{k}: {v}")
        
        cursor.execute("SELECT id, username, expires_at, is_active FROM users LIMIT 5")
        users = [dict(row) for row in cursor.fetchall()]
        print("\nUsers:")
        for u in users:
            print(u)
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
