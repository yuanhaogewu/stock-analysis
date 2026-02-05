import sqlite3
import hashlib
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), 'stock_system.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """初始化数据库"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 创建管理员表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 创建用户表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL
        )
    ''')
    
    # 创建系统配置表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            config_key TEXT UNIQUE NOT NULL,
            config_value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 创建用户自选表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS watchlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            stock_code TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, stock_code)
        )
    ''')
    
    # 插入默认管理员账号
    default_password = hashlib.sha256("Xinsiwei2026@".encode()).hexdigest()
    try:
        cursor.execute(
            "INSERT INTO admin (username, password) VALUES (?, ?)",
            ("xinsiwei", default_password)
        )
    except sqlite3.IntegrityError:
        pass  # 管理员已存在
    
    # 插入默认系统配置
    default_configs = [
        ("deepseek_api_key", os.getenv("DEEPSEEK_API_KEY", "")),
        ("model_id", "deepseek-chat"),
        ("base_url", "https://api.deepseek.com")
    ]
    
    for key, value in default_configs:
        try:
            cursor.execute(
                "INSERT INTO system_config (config_key, config_value) VALUES (?, ?)",
                (key, value)
            )
        except sqlite3.IntegrityError:
            pass
    
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    """密码哈希"""
    return hashlib.sha256(password.encode()).hexdigest()

# 初始化数据库
init_database()
