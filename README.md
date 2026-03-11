# Full-Stack / Partial Technical Assignment  
**Stack:** Laravel + Next.js + React Native  

## Overview

We are evaluating candidates for different roles:

- **Full-stack**: backend + frontend + mobile  
- **Backend**: Laravel API only  
- **Frontend**: Next.js web only  
- **Mobile**: React Native only  

The goal is to **demonstrate your skills**. You **do not need to complete everything** — focus on the areas relevant to your expertise.

**Expected completion time:** 3–4 hours (do not spend more than 5 hours).  

---

# Assignment

You may implement all or a subset of the following:

## Task Management System (Optional Full Stack)

Users should be able to:

- Create tasks
- View tasks
- Mark tasks as completed
- Delete tasks
- Filter tasks by status

**Task fields:**
```
 id
 title
 description
 status (pending / completed)
 priority (low / medium / high)
 created_at
 updated_at
```
---

# Backend Requirements (Laravel) – Optional

If you are applying for **backend or full-stack**, implement a REST API.

### Required Endpoints
```
 POST /api/tasks
 GET /api/tasks
 PUT /api/tasks/{id}
 DELETE /api/tasks/{id}
```

### Requirements

- Use migrations  
- Use request validation  
- Use Eloquent models  
- Return JSON responses  
- Implement filtering by status  

Example:
GET /api/tasks?status=pending

**Edge Case Requirement:** Prevent duplicate tasks with the same title within **10 seconds**.

**Bonus (Optional):** Pagination, Unit tests, Repository/Service pattern.

---

# Web Frontend Requirements (Next.js) – Optional

If you are applying for **frontend or full-stack**, implement a web interface.

### Pages
```
 /tasks
 /tasks/create
```
### Features

- Display tasks  
- Filter by status  
- Mark tasks completed  
- Delete tasks  
- Create new tasks  
- Basic form validation  

**Requirements**

- Fetch data from the API  
- Handle loading & errors  
- Clean component structure  

**Bonus (Optional):** State management (TanStack Query), advanced form validation.
---

# Mobile Requirements (React Native) – Optional

If you are applying for **mobile or full-stack**, implement a mobile screen.

### Screen
TaskListScreen

### Features

- Fetch tasks from API  
- Display list  
- Mark task completed  
- Pull-to-refresh  
- Handle loading & errors  
- Clean component structure  

**Bonus (Optional):** Offline support, TypeScript, deploy via Expo/TestFlight/APK.

---

# Environment Configuration

All implementations should use **environment variables**.  

Include a file:

.env.example


# Example variables:
```
APP_ENV
APP_URL
DB_HOST
DB_DATABASE
DB_USERNAME
DB_PASSWORD
API_URL
```
---

# Repository Structure (Suggested)
```
project-root
├ backend
│ └ laravel-api
├ frontend
│ └ nextjs-app
├ mobile
│ └ react-native-app
└ README.md
```

You may adjust based on your focus area.

---

# Submission Instructions

1. Fork this repository into your own Bitbucket account.  
2. Set the repository visibility to **Private** and invite ashtonz@havence.com.sg as a collaborator.  
3. Create a branch:

submission/<your-name>

Example:
solution/john-jane


4. Commit your work progressively.  
5. Submit a Pull Request to `main`.  
6. Include your README updates with instructions.

---

# Commit Guidelines

- Commit **progressively**, not in a single commit  
- Example of good commits:

initial laravel api setup
add task migration and model
implement api endpoints
add nextjs task list page
add react native task screen


---

# Required README Updates

Please update this README with the following sections:

- **Setup Instructions** – How to run backend, frontend, and mobile app  
- **Assumptions Made** – Describe any assumptions  
- **Libraries Used** – List any extra libraries or frameworks  
- **Architecture Decisions** – Explain your design choices  
- **What You Would Improve With More Time** – Explain potential improvements  

---

# Bonus (Optional)

### Deployment

Deploy the working application (frontend, backend, or both). Include URLs in your README.

### Mobile Build

Provide APK, TestFlight, or Expo link.

### Docker

Include `docker-compose.yml` for local development.

### Automated Tests

Include at least **one automated test**.

---

# Evaluation Criteria

- **Backend** – Laravel best practices, validation, API structure, edge case handling  
- **Frontend** – Component structure, data fetching, error handling  
- **Mobile** – React Native patterns, clean code  
- **Overall** – Project structure, code quality, documentation, commit history  

---

# Technical Review

After submission, selected candidates will be invited to a **30–45 minute code review**.  

During this session, you may be asked to:

- Explain your architecture decisions  
- Walk through your code  
- Add a small feature live  

---

# Notes

- You **do not need to complete everything**. Focus on your area of expertise.  
- You **may use libraries, documentation**, but you must **understand and explain your code** during the interview.
