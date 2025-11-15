# 🚀 Traahi – NGO & Volunteer Connection Platform

<div align="center">
  <img src="https://i.imgur.com/8mpO2t3.png" alt="Traahi Logo" width="150" />
</div>

<p align="center">
A full-stack web platform built with <b>Node.js</b> and <b>PostgreSQL</b>, connecting NGOs with volunteers and donors to manage campaigns, secure donations, and drive community engagement.
</p>

<p align="center">
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
<img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

---

## 📌 About the Project

**Traahi** is a dynamic web application designed to bridge the gap between NGOs and the communities they serve. It offers a two-sided platform:

### 👥 For the Public

* Discover and filter volunteering events
* Register instantly for upcoming events
* Donate securely via Razorpay
* View detailed impact reports & galleries
* Light/Dark theme support

### 🏢 For NGOs

* Secure login & authentication (JWT)
* Private dashboard
* Create/Read/Update/Delete campaigns
* Upload cover images & gallery photos
* Post transparent impact reports
* Track volunteer registrations
* Manage donations

### ⚙️ Backend Automations

* Daily SMS reminders via Twilio (node-cron)
* Real-time volunteer count updates
* Secure & optimized REST API

---

## 🧩 Core Features

### 🌍 Public User Features

* 🔍 Event Discovery
* 🎯 Dynamic Filtering
* 📊 Live Stats on Homepage
* 📝 Volunteer Registration
* 🖼️ Report & Gallery Viewer
* 💳 Secure Razorpay Donations
* 🌓 Dark/Light Mode

---

### 🏢 NGO Admin Features

* 🔐 JWT Authentication
* 📊 NGO Dashboard
* 📁 Full Campaign Management
* 🖼️ Image Uploads (Multer)
* 📝 Impact Reporting

---

## 🛠️ Tech Stack

| Category      | Technology                    |
| ------------- | ----------------------------- |
| Frontend      | HTML, CSS, Vanilla JavaScript |
| Styling       | Tailwind CSS                  |
| Backend       | Node.js, Express.js           |
| Database      | PostgreSQL                    |
| Auth          | JWT, bcrypt.js                |
| Payments      | Razorpay API                  |
| Notifications | Twilio API                    |
| Scheduling    | node-cron                     |
| File Uploads  | Multer                        |

---

## 🔄 Application Flowchart

```mermaid
graph TD
    subgraph "User Interface (Frontend)"
        A[Start: User visits Traahi website] --> B{User Type?};
        B -- Public User --> C[Views Homepage with Stats & Events];
        B -- NGO Admin --> D[Clicks Login/Register];

        C --> E{User Action};
        E -- Clicks 'Register for Event' --> F[Fills Registration Form];
        E -- Clicks 'View Report' --> G[Requests Report Data];
        E -- Clicks 'Donate' --> H[Fills Donation Form];

        D --> I[Enters Credentials];
        I --> J[Submits Login Form];

        subgraph "NGO Dashboard"
            K[Dashboard Visible] --> L{NGO Action};
            L -- Clicks 'Create Campaign' --> M[Fills Campaign Form];
            L -- Clicks 'Add/Edit Report' --> N[Fills Report Form];
        end
    end

    subgraph "Backend Logic (Node.js API)"
        F -- Submits --> P1[POST /api/register];
        G -- Requests --> P2[GET /api/campaigns];
        H -- Submits --> P3[POST /api/payment/order];
        J -- Submits --> P4[POST /api/auth/login];
        M -- Submits --> P5[POST /api/campaigns];
        N -- Submits --> P6[PUT /api/campaigns/:id/report];

        P4 -- Authenticates --> K;
    end

    subgraph "Database & External Services"
        DB[(PostgreSQL Database)];
        TP[(Twilio API for SMS)];
        RP[(Razorpay API for Payments)];

        P1 --> DB[Save Registration];
        P1 --> TP[Schedule SMS Reminder];
        P2 --> DB[Fetch Campaign Data];
        P3 --> RP[Create Payment Order];
        P4 --> DB[Verify User Credentials];
        P5 --> DB[Save New Campaign];
        P6 --> DB[Update Campaign with Report];
    end

    style K fill:#e6fffa,stroke:#333,stroke-width:2px
```

---

## 🚀 Future Enhancements

* Volunteer user accounts
* Recurring donations
* NGO analytics dashboard
* Email notifications
* Map-based event discovery
* Mobile app (React Native / Flutter)

---

## 📦 Installation Guide

### 1️⃣ Clone the Repository

```sh
git clone https://github.com/your-username/Traahi.git
cd Traahi
```

### 2️⃣ Install Backend Dependencies

```sh
cd traahi-backend
npm install
```

### 3️⃣ Create `.env` File

```
PORT=9000
DATABASE_URL=your_postgres_url
JWT_SECRET=your_secret_key
RAZORPAY_KEY_ID=xxx
RAZORPAY_KEY_SECRET=xxx
TWILIO_SID=xxx
TWILIO_AUTH=xxx
```

### 4️⃣ Start the Backend Server

```sh
node server.js
```

### 5️⃣ Run Frontend

Open `main/index.html` in your browser.

---

## 🤝 Contributing

1. Fork the repository
2. Create a new branch
3. Commit your changes
4. Submit a pull request

---

## 📜 License

This project is licensed under the **MIT License**.

---

## 📬 Contact

**Ashtsiddhi Kadam**
GitHub: [https://github.com/ashtsiddhi30](https://github.com/ashtsiddhi30)

