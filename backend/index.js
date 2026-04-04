import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const app = express();

// CORS - fix the trailing slash
app.use(cors({
  origin: "https://synchire-frontend.vercel.app"  // Removed trailing slash
}));
app.use(express.json());

// DATABASE CONNECTION - Use ONLY pg pool, NOT @neondatabase/serverless
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Changed from POSTGRES_URL to DATABASE_URL
  ssl: { rejectUnauthorized: false }  // Required for Neon
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to database:", err.stack);
  } else {
    console.log("Connected to database successfully");
    release();
  }
});

// --- API ---
app.get("/data", async (req, res) => {
  try {
    const interviews = await pool.query(`
      SELECT i.interview_id, s.name as student, p.name as panel, i.interview_datetime, s.grade
      FROM Interviews i 
      JOIN Students s ON i.student_id = s.student_id 
      JOIN Panels p ON i.panel_id = p.panel_id 
      WHERE i.status = 'Scheduled'
      ORDER BY i.interview_datetime ASC`);
    
    const students = await pool.query("SELECT * FROM Students ORDER BY student_id");
    const panels = await pool.query("SELECT * FROM Panels ORDER BY panel_id");
    
    res.json({ interviews: interviews.rows, students: students.rows, panels: panels.rows });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.post("/add-student", async (req, res) => {
  try {
    const { name, grade } = req.body;
    if (!name || !grade) {
      return res.status(400).json({ error: "Name and grade are required" });
    }
    await pool.query("INSERT INTO Students (name, grade) VALUES ($1, $2)", [name, grade]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error adding student:", error);
    res.status(500).json({ error: "Failed to add student" });
  }
});

app.post("/add-panel", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Panel name is required" });
    }
    await pool.query("INSERT INTO Panels (name) VALUES ($1)", [name]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error adding panel:", error);
    res.status(500).json({ error: "Failed to add panel" });
  }
});

// --- THE SCHEDULER LOGIC (FIXED) ---
app.post("/generate", async (req, res) => {
  try {
    // Get students not yet scheduled, ordered by grade (higher grades first)
    const students = (await pool.query(`
      SELECT * FROM Students 
      WHERE student_id NOT IN (SELECT student_id FROM Interviews) 
      ORDER BY grade DESC
    `)).rows;
    
    const panels = (await pool.query("SELECT * FROM Panels")).rows;

    if (students.length === 0) {
      return res.json({ msg: "No students to schedule" });
    }
    if (panels.length === 0) {
      return res.json({ msg: "No panels available. Please add panels first." });
    }

    let day = new Date();
    day.setDate(day.getDate() + 1); // Start Tomorrow
    day.setHours(0, 0, 0, 0);

    const hours = [9, 10, 11, 14, 15]; // 5 slots per panel per day
    let sIdx = 0;
    let maxDays = 30;
    let daysScheduled = 0;

    while (sIdx < students.length && daysScheduled < maxDays) {
      // Skip weekends
      if (day.getDay() === 6) { // Saturday
        day.setDate(day.getDate() + 2);
        continue;
      }
      if (day.getDay() === 0) { // Sunday
        day.setDate(day.getDate() + 1);
        continue;
      }

      const dateStr = day.toISOString().split('T')[0];
      
      for (let h of hours) {
        for (let p of panels) {
          if (sIdx >= students.length) break;

          // Check daily limit (max 3 per panel per day)
          const dailyCount = await pool.query(
            "SELECT COUNT(*) FROM Interviews WHERE panel_id=$1 AND DATE(interview_datetime)=$2",
            [p.panel_id, dateStr]
          );
          
          if (parseInt(dailyCount.rows[0].count) >= 3) {
            continue; // Panel already has 3 interviews today
          }

          // Check if this specific time slot is already taken by this panel
          const slotDateTime = new Date(day);
          slotDateTime.setHours(h, 0, 0, 0);
          
          const slotTaken = await pool.query(
            "SELECT COUNT(*) FROM Interviews WHERE panel_id=$1 AND interview_datetime=$2",
            [p.panel_id, slotDateTime]
          );
          
          if (parseInt(slotTaken.rows[0].count) > 0) {
            continue; // This time slot is already booked
          }

          // Schedule the interview
          if (slotDateTime > new Date()) {
            await pool.query(
              "INSERT INTO Interviews (student_id, panel_id, interview_datetime, status) VALUES ($1, $2, $3, 'Scheduled')",
              [students[sIdx].student_id, p.panel_id, slotDateTime]
            );
            console.log(`Scheduled: Student ${students[sIdx].name} with Panel ${p.name} at ${slotDateTime}`);
            sIdx++;
          }
        }
      }
      day.setDate(day.getDate() + 1);
      daysScheduled++;
    }

    if (sIdx < students.length) {
      res.json({ msg: `Partially scheduled: ${sIdx} of ${students.length} students. Need more panels or days.` });
    } else {
      res.json({ msg: `Successfully scheduled ${students.length} interviews` });
    }
  } catch (error) {
    console.error("Error generating schedule:", error);
    res.status(500).json({ error: "Failed to generate schedule" });
  }
});

app.delete("/done/:id", async (req, res) => {
  try {
    // First get the student_id before deleting the interview
    const result = await pool.query("SELECT student_id FROM Interviews WHERE interview_id = $1", [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Interview not found" });
    }
    
    const sId = result.rows[0].student_id;
    
    // Delete the interview
    await pool.query("DELETE FROM Interviews WHERE interview_id = $1", [req.params.id]);
    
    // Delete the student
    if (sId) {
      await pool.query("DELETE FROM Students WHERE student_id = $1", [sId]);
    }
    
    res.json({ success: true, message: "Interview completed and student removed" });
  } catch (error) {
    console.error("Error completing interview:", error);
    res.status(500).json({ error: "Failed to complete interview" });
  }
});
// Delete panel only if it has no scheduled interviews
app.delete("/delete-panel/:id", async (req, res) => {
  try {
    const panelId = req.params.id;
    
    // Check if panel has any scheduled interviews
    const interviewCheck = await pool.query(
      "SELECT COUNT(*) FROM Interviews WHERE panel_id = $1 AND status = 'Scheduled'",
      [panelId]
    );
    
    const scheduledCount = parseInt(interviewCheck.rows[0].count);
    
    if (scheduledCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete panel. It has ${scheduledCount} scheduled interview(s). Complete or delete them first.` 
      });
    }
    
    // Also check if panel has any completed interviews (optional - can keep for history)
    const completedCheck = await pool.query(
      "SELECT COUNT(*) FROM Interviews WHERE panel_id = $1 AND status != 'Scheduled'",
      [panelId]
    );
    
    const completedCount = parseInt(completedCheck.rows[0].count);
    
    if (completedCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete panel. It has ${completedCount} completed interview(s) in history.` 
      });
    }
    
    // If no interviews at all, delete the panel
    const result = await pool.query("DELETE FROM Panels WHERE panel_id = $1 RETURNING name", [panelId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Panel not found" });
    }
    
    res.json({ 
      success: true, 
      message: `Panel "${result.rows[0].name}" deleted successfully` 
    });
  } catch (error) {
    console.error("Error deleting panel:", error);
    res.status(500).json({ error: "Failed to delete panel" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));