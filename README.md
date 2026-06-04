# UniBite

UniBite is a localized food-sharing web application designed specifically for university students. It connects students who have extra home-cooked portions (Cooks) with their fellow students (Consumers) to combat food waste, save money, and foster a sharing community on campus.

## Features

- **Role Switching**: Users can dynamically switch between being a "Consumer" (looking for food) and a "Cook" (offering food) from the same account.
- **Interactive Feed**: A dynamic listing feed with real-time smart polling to keep the available food up to date without refreshing.
- **Smart Distance Filtering**: Integrated with Leaflet.js and OpenStreetMap to automatically calculate the distance between you and the pickup location. Filter nearby meals instantly using a modern slider UI.
- **Interactive Maps**: Pinpoint pickup locations directly on an interactive map.
- **Order Tracking & Reviews**: Keep track of your reservations and leave 5-star ratings for the meals you've received.
- **Points System**: (Upcoming) Earn points by sharing food and spend them to grab meals from others.
- **Mobile-First Responsive UI**: A beautiful, premium design featuring glassmorphism, subtle micro-animations, and CSS Grid layouts tailored for smartphones and desktops alike.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Custom CSS Variables & Flexbox/Grid
- **Mapping**: Leaflet.js with CartoCDN Tiles
- **Backend**: Express.js (Node.js)
- **Database**: MySQL (via `mysql2` package)
- **Security**: JWT Authentication & Bcrypt Password Hashing

## Getting Started

### Prerequisites
- Node.js (v16+)
- MySQL Server

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/GTRIANTAF/UniBite-Web-Development.git
   cd UniBite-Web-Development
