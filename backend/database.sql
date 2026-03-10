CREATE DATABASE IF NOT EXISTS toll_claim_db;
USE toll_claim_db;

CREATE TABLE IF NOT EXISTS transporters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(100),
    pan_number VARCHAR(100),
    vendor_code VARCHAR(100),
    plant_manager_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transporter_id INT,
    vehicle_number VARCHAR(50) NOT NULL UNIQUE,
    driver_name VARCHAR(255),
    driver_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transporter_id) REFERENCES transporters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    loading_location VARCHAR(255) NOT NULL,
    loading_sap_code VARCHAR(50),
    unloading_location VARCHAR(255) NOT NULL,
    unloading_sap_code VARCHAR(50),
    rate_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS toll_plazas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS toll_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT,
    toll_plaza_id INT,
    vehicle_type VARCHAR(50) DEFAULT 'Truck',
    approved_rate DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    FOREIGN KEY (toll_plaza_id) REFERENCES toll_plazas(id) ON DELETE CASCADE,
    UNIQUE KEY route_plaza (route_id, toll_plaza_id)
);

CREATE TABLE IF NOT EXISTS fastag_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE,
    transaction_date DATETIME NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    toll_plaza_name VARCHAR(255) NOT NULL,
    paid_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claim_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_number VARCHAR(100) UNIQUE NOT NULL,
    transporter_id INT,
    vehicle_number VARCHAR(50),
    route_id INT,
    total_paid DECIMAL(10, 2) DEFAULT 0,
    total_approved DECIMAL(10, 2) DEFAULT 0,
    difference_amount DECIMAL(10, 2) DEFAULT 0,
    shipment_no VARCHAR(100),
    shipment_date DATE,
    bill_from_date DATE,
    bill_to_date DATE,
    generated_by VARCHAR(50) DEFAULT 'System',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transporter_id) REFERENCES transporters(id) ON DELETE SET NULL,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Operator') DEFAULT 'Operator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin
INSERT IGNORE INTO users (username, password_hash, role) VALUES ('admin', '$2a$10$wE4L8bW2qJ/K1tO.vF5o6.3W8/i0.1vT/.uG.r/lEaYxL6C2Yj7yO', 'Admin');
-- password: password123
