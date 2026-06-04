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
                        latitude DECIMAL(10,8) NOT NULL,
                        longitude DECIMAL(10,8) NOT NULL,
                        total_portions INT NOT NULL,
                        available_portions INT NOT NULL,
                        status ENUM ('Active', 'Inactive', 'Deleted') NOT NULL DEFAULT 'Active',
                        creation_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY(listing_id),
                        FOREIGN KEY(cook_id) REFERENCES User(user_id) ON DELETE CASCADE,
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
                        FOREIGN KEY(listing_id) REFERENCES Listing(listing_id) ON DELETE CASCADE,
                        FOREIGN KEY(consumer_id) REFERENCES User(user_id) ON DELETE CASCADE
);

CREATE TABLE Rating(
                       rating_id INT AUTO_INCREMENT,
                       request_id INT NOT NULL UNIQUE,
                       score ENUM ('1','2','3','4','5') NOT NULL,
                       rated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       bonus_awarded BOOLEAN NOT NULL DEFAULT FALSE,
                       PRIMARY KEY(rating_id),
                       FOREIGN KEY (request_id) REFERENCES Request(request_id)  ON DELETE CASCADE
);



CREATE INDEX idx_listing_cook_id ON Listing(cook_id);
CREATE INDEX idx_request_listing_id ON Request(listing_id);
CREATE INDEX idx_request_consumer_id ON Request(consumer_id);
CREATE INDEX idx_rating_request_id ON Rating(request_id);

INSERT INTO User (username, email, password_hash, points, is_admin)
VALUES
    ('admin_user', 'admin@test.com', '$2b$10$WfgZ4OLneXuXIuFmRkjeG.3iG9QOCgBMtb4TIdZchtyzygJJRZjGO', 5, 1),
    ('maria_cook', 'maria@test.com', '$2b$10$WfgZ4OLneXuXIuFmRkjeG.3iG9QOCgBMtb4TIdZchtyzygJJRZjGO', 20, FALSE),
    ('nikos_cook', 'nikos@test.com', '$2b$10$WfgZ4OLneXuXIuFmRkjeG.3iG9QOCgBMtb4TIdZchtyzygJJRZjGO', 18, FALSE),
    ('eleni_cook', 'eleni@test.com', '$2b$10$WfgZ4OLneXuXIuFmRkjeG.3iG9QOCgBMtb4TIdZchtyzygJJRZjGO', 14, FALSE),
    ('kostas_cook', 'kostas@test.com', '$2b$10$WfgZ4OLneXuXIuFmRkjeG.3iG9QOCgBMtb4TIdZchtyzygJJRZjGO', 10, FALSE),
    ('giorgos_user', 'giorgos@test.com', '$2b$10$WfgZ4OLneXuXIuFmRkjeG.3iG9QOCgBMtb4TIdZchtyzygJJRZjGO', 8, FALSE),
    ('sofia_user', 'sofia@test.com', '$2b$10$WfgZ4OLneXuXIuFmRkjeG.3iG9QOCgBMtb4TIdZchtyzygJJRZjGO', 12, FALSE),
    ('petros_user', 'petros@test.com', '$2b$10$WfgZ4OLneXuXIuFmRkjeG.3iG9QOCgBMtb4TIdZchtyzygJJRZjGO', 0, FALSE),
    ('anna_user', 'anna@test.com', '$2b$10$WfgZ4OLneXuXIuFmRkjeG.3iG9QOCgBMtb4TIdZchtyzygJJRZjGO', 6, FALSE),
    ('hybrid_user', 'hybrid@test.com', '$2b$10$WfgZ4OLneXuXIuFmRkjeG.3iG9QOCgBMtb4TIdZchtyzygJJRZjGO', 25, FALSE);

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
    status,
    creation_timestamp
)
VALUES
    (2, 'Σπιτικό παστίτσιο', 'Σπιτικό παστίτσιο με κιμά και μπεσαμέλ.', 'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=800', 'Gluten, Dairy, Eggs', 'Agiou Nikolaou 20, Patras', 'Apartment Building A', '2nd floor, ring Papadopoulos.', DATE_ADD(NOW(), INTERVAL 2 HOUR), 38.24663900, 21.73457300, 4, 4, 'Active', NOW()),
    (2, 'Γεμιστά', 'Ντομάτες και πιπεριές γεμιστές με ρύζι και μυρωδικά.', 'https://images.unsplash.com/photo-1604908177522-040687070061?w=800', NULL, 'University of Patras, Patras', 'Student Dorms', 'Entrance B.', DATE_ADD(NOW(), INTERVAL 3 HOUR), 38.28825400, 21.78846400, 3, 0, 'Inactive', NOW()),
    (2, 'Μακαρόνια με σάλτσα', 'Μακαρόνια με κόκκινη σάλτσα και βασιλικό.', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800', 'Gluten', 'Georgiou Square, Patras', 'Central Square', 'Near the fountain.', DATE_ADD(NOW(), INTERVAL 4 HOUR), 38.24624200, 21.73508400, 5, 2, 'Active', NOW()),
    (3, 'Chicken rice bowl', 'Κοτόπουλο με ρύζι, λαχανικά και γιαούρτι.', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', 'Dairy', 'Syntagma Square, Athens', 'Metro Entrance', 'Outside the metro entrance.', DATE_ADD(NOW(), INTERVAL 2 HOUR), 37.97556400, 23.73483200, 3, 2, 'Active', NOW()),
    (3, 'Φακές σούπα', 'Φακές με ψωμί και ελαιόλαδο.', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800', 'Gluten', 'Monastiraki Square, Athens', 'Near Metro', 'At the square entrance.', DATE_ADD(NOW(), INTERVAL 5 HOUR), 37.97608300, 23.72564800, 4, 3, 'Active', NOW()),
    (3, 'Σαλάτα κινόα', 'Σαλάτα με κινόα, λαχανικά και λεμόνι.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', NULL, 'National Garden, Athens', 'Main Gate', 'Bench near main gate.', DATE_ADD(NOW(), INTERVAL 6 HOUR), 37.97399800, 23.73764700, 2, 2, 'Active', NOW()),
    (4, 'Vegetarian pasta', 'Πάστα με μανιτάρια, ντομάτα και βασιλικό.', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800', 'Gluten', 'Aristotelous Square, Thessaloniki', 'Central Pickup Point', 'Near the statue.', DATE_ADD(NOW(), INTERVAL 3 HOUR), 40.63206300, 22.94075200, 5, 5, 'Active', NOW()),
    (4, 'Pizza slices', 'Κομμάτια πίτσας με τυρί και ντομάτα.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800', 'Gluten, Dairy', 'Kamara, Thessaloniki', 'Arch Area', 'Near the arch.', DATE_ADD(NOW(), INTERVAL 4 HOUR), 40.63292200, 22.95180900, 8, 7, 'Active', NOW()),
    (4, 'Ριζότο μανιταριών', 'Κρεμώδες ριζότο με μανιτάρια.', 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800', 'Dairy', 'White Tower, Thessaloniki', 'Seafront', 'On the sea side.', DATE_ADD(NOW(), INTERVAL 5 HOUR), 40.62644600, 22.94842600, 3, 1, 'Active', NOW()),
    (5, 'Cretan dakos', 'Ντάκος με ντομάτα, φέτα, ελαιόλαδο και ρίγανη.', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800', 'Gluten, Dairy', 'Lions Square, Heraklion', 'Fountain Area', 'Next to the fountain.', DATE_ADD(NOW(), INTERVAL 2 HOUR), 35.33914800, 25.13328500, 6, 6, 'Active', NOW()),
    (5, 'Σαλάτα με φαλάφελ', 'Φαλάφελ με λαχανικά και σως ταχίνι.', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800', 'Sesame', 'Old Venetian Harbor, Chania', 'Harbor Entrance', 'Near the lighthouse view.', DATE_ADD(NOW(), INTERVAL 3 HOUR), 35.51792500, 24.01761700, 4, 4, 'Active', NOW()),
    (10, 'Greek salad box', 'Χωριάτικη σαλάτα με φέτα, ελιές και ψωμί.', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800', 'Dairy, Gluten', 'Central Square, Larissa', 'Clock Area', 'Near the main square.', DATE_ADD(NOW(), INTERVAL 2 HOUR), 39.63902200, 22.41912500, 5, 5, 'Active', NOW()),
    (10, 'Bean stew', 'Φασολάδα με ντομάτα και μυρωδικά.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', NULL, 'Lake Pamvotida, Ioannina', 'Lake Walk', 'Near the lake benches.', DATE_ADD(NOW(), INTERVAL 3 HOUR), 39.66502900, 20.85374700, 3, 3, 'Active', NOW()),
    (10, 'Old hidden listing', 'Old listing for deleted status testing.', NULL, NULL, 'Old Center, Patras', 'Old Building', NULL, DATE_SUB(NOW(), INTERVAL 40 HOUR), 38.24620000, 21.73510000, 1, 1, 'Active', DATE_SUB(NOW(), INTERVAL 72 HOUR)),
    (3, 'Deleted listing test', 'This listing should not appear in feed.', NULL, NULL, 'Athens Center', 'Deleted Building', NULL, DATE_ADD(NOW(), INTERVAL 1 HOUR), 37.98381000, 23.72753900, 2, 2, 'Deleted', NOW());