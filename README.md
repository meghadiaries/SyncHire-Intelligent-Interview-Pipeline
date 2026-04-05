# 🚀 SyncHire | Parallel Interview Scheduler

<div align="center">
  <p align="center">
    <strong>A high-performance resource management tool designed to clear interview backlogs in record time.</strong>
  </p>

  <video src="https://github.com/user-attachments/assets/5e804940-035d-4d0d-a7b4-cc80c5b5faf2" width="100%" muted autoplay loop playsinline></video>

  <p align="center">
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  </p>
</div>

---

## 💡 The Core Problem
Most scheduling systems handle one interview at a time. **SyncHire** treats panels as parallel resources. By implementing a **Greedy Parallel Algorithm**, the system saturates every available slot simultaneously, ensuring the earliest possible completion date for any candidate pool.

---

## 🛠️ Tech Stack
* **Frontend:** React.js (Vite)
* **Backend:** Node.js + Express.js
* **Database:** PostgreSQL (Transactional Logic)
* **Styling:** Custom "Neat Dark" CSS

---

## ✨ Key Features

### 1. Earliest Finish Logic (Parallelization)
The system treats every panel member as a parallel resource. If you have **N** panels, the system schedules **N** interviews simultaneously for every time slot before moving to the next hour.

### 2. Automatic Saturation
The algorithm ensures a day is 100% saturated (3 interviews per panel) before jumping to the next available date. It automatically respects weekends (skipping Saturdays and Sundays).

### 3. Smart Queue Management
* **Student Priority:** Automatically sorts candidates based on grades.
* **Dynamic Resources:** Add new panel members mid-session to instantly increase daily throughput.
* **Live Deletion:** Marking a task as "Done" removes the student from the database, keeping the logic lean and fast.
