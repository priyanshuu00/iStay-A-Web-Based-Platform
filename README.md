# iStay — Property Finder Platform

A full-stack web application that allows users to search rental and sale properties and enables property owners to list their properties.

![Java](https://img.shields.io/badge/Java-24-orange) ![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.4-green) ![MySQL](https://img.shields.io/badge/MySQL-8.0-blue) ![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple)

## Features

- **User Authentication** — Register & login with JWT-based security
- **Property Listing** — Owners can add properties with images, amenities, and details
- **Advanced Search** — Filter by location, price range, rooms, type, and amenities
- **Pagination & Sorting** — Browse results with page controls and sort by price/date
- **Owner Dashboard** — Manage listed properties with stats overview
- **Responsive Design** — Mobile-friendly UI with premium glassmorphism aesthetics

## Tech Stack

| Layer      | Technology                              |
|:-----------|-----------------------------------------|
| Backend    | Java 24, Spring Boot 3.4.4, Spring Security, Spring Data JPA |
| Database   | MySQL 8.0                               |
| Frontend   | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5 |
| Auth       | JWT (JSON Web Tokens) via jjwt 0.12.6   |
| Build Tool | Maven 3.9.9                             |

## Project Structure

```
Istay/
├── backend/                     # Spring Boot REST API
│   ├── pom.xml                  # Maven config & dependencies
│   └── src/main/java/com/istay/
│       ├── IstayApplication.java
│       ├── config/              # Security, JWT, CORS
│       ├── controller/          # REST endpoints
│       ├── service/             # Business logic
│       ├── repository/          # Data access layer
│       ├── model/               # JPA entities
│       ├── dto/                 # Request/Response objects
│       └── exception/           # Error handling
├── frontend/                    # Static HTML/CSS/JS
│   ├── index.html               # Home + search
│   ├── login.html / register.html
│   ├── add-property.html
│   ├── property-details.html
│   ├── dashboard.html
│   ├── css/style.css
│   └── js/                      # Modular JavaScript
├── database/
│   └── schema.sql               # MySQL schema
└── README.md
```

## Setup Instructions

### Prerequisites

- Java 17+ (tested on Java 24)
- Maven 3.8+
- MySQL 8.0+
- A modern web browser

### 1. Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Run the schema
source database/schema.sql;
```

Or simply start the backend — Spring Boot will auto-create tables via `ddl-auto=update`.

### 2. Configure Database Credentials

Edit `backend/src/main/resources/application.properties`:

```properties
spring.datasource.username=root
spring.datasource.password=root
```

### 3. Run the Backend

```bash
cd backend
mvn spring-boot:run
```

The API will be available at `http://localhost:8080`.

### 4. Open the Frontend

Open `frontend/index.html` directly in your browser, or use a local server:

```bash
# Using Python
cd frontend
python -m http.server 5500

# Then open http://localhost:5500
```

## API Reference

### Authentication

| Method | Endpoint             | Description     | Auth |
|:-------|:---------------------|:----------------|:-----|
| POST   | `/api/auth/register` | Register user   | No   |
| POST   | `/api/auth/login`    | Login user      | No   |

### Properties

| Method | Endpoint                  | Description              | Auth     |
|:-------|:--------------------------|:-------------------------|:---------|
| GET    | `/api/properties`         | List all (paginated)     | No       |
| GET    | `/api/properties/{id}`    | Get by ID                | No       |
| GET    | `/api/properties/search`  | Search with filters      | No       |
| POST   | `/api/properties`         | Add property             | Required |
| GET    | `/api/properties/owner`   | Get owner's properties   | Required |
| DELETE | `/api/properties/{id}`    | Delete (owner only)      | Required |

### Search Parameters

```
GET /api/properties/search?location=Mumbai&minPrice=5000&maxPrice=50000&rooms=2&type=RENT&amenities=WiFi&page=0&size=12&sortBy=price&direction=asc
```

## Database Schema

```
users                          properties
┌──────────────┐              ┌──────────────────┐
│ id (PK)      │──────────────│ owner_id (FK)    │
│ name         │              │ id (PK)          │
│ email (UQ)   │              │ title            │
│ password     │              │ description      │
│ created_at   │              │ location         │
└──────────────┘              │ price            │
                              │ rooms            │
                              │ type (RENT/SALE) │
                              │ amenities        │
                              │ image_url        │
                              │ created_at       │
                              └──────────────────┘
```

## License

This project is built for educational and demonstration purposes.
