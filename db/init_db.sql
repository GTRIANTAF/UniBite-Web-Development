DROP DATABASE IF EXISTS UniBite;
CREATE DATABASE UniBite;

USE UniBite;

CREATE TABLE User(
    user_id INT AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    points INT NOT NULL DEFAULT 5,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY(user_id),
    CHECK (points >= 0)
);

CREATE TABLE Listing(
    listing_id INT AUTO_INCREMENT,
    cook_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    allergens TEXT,
    pickup_location TEXT NOT NULL,
    pickup_building VARCHAR(100) NOT NULL,
    pickup_details TEXT,
    pickup_time DATETIME NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    total_portions INT NOT NULL,
    available_portions INT NOT NULL,
    status ENUM ('Active', 'Inactive', 'Deleted') NOT NULL DEFAULT 'Active',
    creation_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(listing_id),
    FOREIGN KEY(cook_id) REFERENCES User(user_id),
    CHECK (total_portions > 0),
    CHECK (available_portions >= 0),
    CHECK (available_portions <= total_portions)
);

CREATE TABLE Request(
    request_id INT AUTO_INCREMENT,
    listing_id INT NOT NULL,
    consumer_id INT NOT NULL,
    status ENUM ('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    delivery_status ENUM ('Pending', 'Picked_Up', 'No_Show') NOT NULL DEFAULT 'Pending',
    creation_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decision_timestamp TIMESTAMP NULL,
    pickup_timestamp TIMESTAMP NULL,
    rating_penalty_applied BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY(request_id),
    FOREIGN KEY(listing_id) REFERENCES Listing(listing_id),
    FOREIGN KEY(consumer_id) REFERENCES User(user_id)
);

CREATE TABLE Rating(
    rating_id INT AUTO_INCREMENT,
    request_id INT NOT NULL UNIQUE,
    score ENUM ('1','2','3','4','5') NOT NULL,
    rated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    bonus_awarded BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY(rating_id),
    FOREIGN KEY (request_id) REFERENCES Request(request_id)
);

CREATE INDEX idx_listing_cook_id ON Listing(cook_id);
CREATE INDEX idx_request_listing_id ON Request(listing_id);
CREATE INDEX idx_request_consumer_id ON Request(consumer_id);
CREATE INDEX idx_rating_request_id ON Rating(request_id);

INSERT INTO User (username, email, password_hash, points, is_admin)
VALUES
('maria_cook', 'maria@test.com', '$2a$10$wUZpW1r8E0RYxVhAP1YtSevbnID8RaT3WBtVxcu3kDcMhgr2XYWmG', 5, FALSE),
('giorgos_user', 'giorgos@test.com', '$2a$10$wUZpW1r8E0RYxVhAP1YtSevbnID8RaT3WBtVxcu3kDcMhgr2XYWmG', 5, FALSE),
('admin_user', 'admin@test.com', '$2a$10$wUZpW1r8E0RYxVhAP1YtSevbnID8RaT3WBtVxcu3kDcMhgr2XYWmG', 5, TRUE);

INSERT INTO Listing (
    cook_id,
    title,
    description,
    photo_url,
    allergens,
    pickup_location,
    pickup_building,
    pickup_details,
    pickup_time,
    latitude,
    longitude,
    total_portions,
    available_portions,
    status
)
VALUES
(
    1,
    'Σπιτικά μακαρόνια',
    'Περίσσεψαν 3 μερίδες από σπιτικά μακαρόνια με σάλτσα ντομάτας.',
    NULL,
    'Gluten',
    'Πανεπιστήμιο Πατρών',
    'Βιβλιοθήκη',
    'Είσοδος βιβλιοθήκης, δίπλα στα σκαλιά.',
    DATE_ADD(NOW(), INTERVAL 2 HOUR),
    38.28923000,
    21.78504000,
    3,
    3,
    'Active'
),
(
    1,
    'Ρύζι με λαχανικά',
    'Διαθέσιμες 2 μερίδες, χωρίς κρέας.',
    NULL,
    NULL,
    'Πανεπιστήμιο Πατρών',
    'Τμήμα Μηχανικών Η/Υ',
    'Κεντρική είσοδος.',
    DATE_ADD(NOW(), INTERVAL 3 HOUR),
    38.28670000,
    21.78700000,
    2,
    1,
    'Active'
);

INSERT INTO Request (
    listing_id,
    consumer_id,
    status,
    delivery_status
)
VALUES
(1, 2, 'Pending', 'Pending'),
(2, 2, 'Approved', 'Pending');
