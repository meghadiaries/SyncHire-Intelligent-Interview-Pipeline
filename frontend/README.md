# 🚀 SyncHire | Parallel Interview Scheduler

**SyncHire** is a high-performance resource management tool designed to clear interview backlogs in record time. It uses a **Greedy Parallel Algorithm** to saturate every available panel member’s schedule, ensuring the earliest possible completion date for any candidate pool.

---

## 🛠️ Tech Stack
* **Frontend:** React.js (Vite)
* **Backend:** Node.js + Express.js
* **Database:** PostgreSQL
* **Styling:** Custom "Neat Dark" CSS (GitHub-inspired)

---

## ✨ Key Features

### 1. Earliest Finish Logic (Parallelization)
The system treats every panel member as a parallel resource. If you have **N** panels, the system schedules **N** interviews simultaneously for every time slot (9 AM, 10 AM, etc.) before moving to the next hour.

### 2. Automatic Saturation
The algorithm ensures a day is 100% saturated (3 interviews per panel) before jumping to the next available date. It automatically respects weekends (skipping Saturdays and Sundays).

### 3. Smart Queue Management
* **Student Priority:** Automatically sorts candidates based on grades.
* **Dynamic Resources:** Add new panel members mid-session to instantly increase daily throughput.
* **Live Deletion:** Marking a task as "Done" removes the student from the database, keeping the logic lean and fast.

---

