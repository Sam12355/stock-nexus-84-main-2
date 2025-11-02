-- Create ICA Delivery table
CREATE TABLE IF NOT EXISTS ica_delivery (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    amount INTEGER NOT NULL,
    time_of_day VARCHAR(50) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on submitted_at for faster queries
CREATE INDEX idx_ica_delivery_submitted_at ON ica_delivery(submitted_at DESC);

-- Create index on user_name
CREATE INDEX idx_ica_delivery_user_name ON ica_delivery(user_name);
