DROP DATABASE IF EXISTS UniBite;
CREATE DATABASE UniBite;

USE UniBite;

CREATE TABLE User(
    user_id INT AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    points INT NOT NULL DEFAULT 5,
    is_admin BOOLEAN,
    PRIMARY KEY(user_id)
);

CREATE TABLE Listing(
    listing_id INT AUTO_INCREMENT,
    cook_id INT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    allergens TEXT,
    pickup_location TEXT NOT NULL,
    pickup_time DATETIME NOT NULL,
    total_portions INT,
    available_portions INT,
    status ENUM ('Active', 'Inactive', 'Deleted'),
    creation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(listing_id),
    FOREIGN KEY(cook_id) REFERENCES User(user_id)
);

CREATE TABLE Request(
    request_id INT AUTO_INCREMENT,
    listing_id INT,
    consumer_id INT,
    status ENUM ('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    delivery_status ENUM ('Pending', 'Picked Up', 'Didnt show'),
    creation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(request_id),
    FOREIGN KEY(listing_id) REFERENCES food_Posting(listing_id),
    FOREIGN KEY(consumer_id) REFERENCES User(user_id)
);

CREATE TABLE Rating(
    rating_id INT AUTO_INCREMENT,
    request_id INT,
    score ENUM ('1','2','3','4','5'),
    rated_at TIMESTAMP NOT NULL,
    PRIMARY KEY(rating_id),
    FOREIGN KEY (request_id) REFERENCES Request(request_id)
);