import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [data, setData] = useState({ interviews: [], students: [], panels: [] });
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [pName, setPName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [selectedPanelName, setSelectedPanelName] = useState('');


  const API_BASE_URL = 'http://localhost:5000';

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/data`);
      setData(res.data);
    } catch (error) {
      console.error('Load error:', error);
      showMessage('Failed to load data. Check if server is running.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addStudent = async () => {
    if (!name.trim()) {
      showMessage('Please enter student name', 'error');
      return;
    }
    if (!grade.trim()) {
      showMessage('Please enter grade', 'error');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/add-student`, { name: name.trim(), grade: grade.trim() });
      setName('');
      setGrade('');
      await load();
      showMessage('Student added successfully!', 'success');
    } catch (error) {
      console.error('Add student error:', error);
      showMessage('Failed to add student', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addPanel = async () => {
    if (!pName.trim()) {
      showMessage('Please enter panel name', 'error');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/add-panel`, { name: pName.trim() });
      setPName('');
      await load();
      showMessage('Panel added successfully!', 'success');
    } catch (error) {
      console.error('Add panel error:', error);
      showMessage('Failed to add panel', 'error');
    } finally {
      setLoading(false);
    }
  };
  const deletePanel = async () => {
    if (!selectedPanelId) {
      showMessage('Please select a panel to delete', 'error');
      return;
    }

    if (window.confirm(`⚠️ WARNING: Are you sure you want to delete panel "${selectedPanelName}"?\n\nThis will ONLY work if the panel has NO scheduled or completed interviews.`)) {
      try {
        setLoading(true);
        const response = await axios.delete(`${API_BASE_URL}/delete-panel/${selectedPanelId}`);
        showMessage(response.data.message || 'Panel deleted successfully!', 'success');
        setShowDeletePanel(false);
        setSelectedPanelId('');
        setSelectedPanelName('');
        await load(); // Refresh the data
      } catch (error) {
        console.error('Delete panel error:', error);
        showMessage(error.response?.data?.error || 'Failed to delete panel', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const generate = async () => {
    if (data.students.length === 0) {
      showMessage('No students to schedule. Please add students first.', 'error');
      return;
    }
    if (data.panels.length === 0) {
      showMessage('No panels available. Please add panels first.', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/generate`);
      await load();
      showMessage(response.data.msg || 'Schedule generated successfully!', 'success');
    } catch (error) {
      console.error('Generate error:', error);
      showMessage(error.response?.data?.error || 'Failed to generate schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  const finish = async (id, studentName) => {
    if (window.confirm(`Mark interview with ${studentName} as completed? This will remove the student from the system.`)) {
      try {
        setLoading(true);
        await axios.delete(`${API_BASE_URL}/done/${id}`);
        await load();
        showMessage('Interview completed successfully!', 'success');
      } catch (error) {
        console.error('Finish error:', error);
        showMessage('Failed to complete interview', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Statistics
  const totalScheduled = data.interviews.length;
  const totalStudents = data.students.length;
  const unscheduledStudents = totalStudents - totalScheduled;

  return (
    <div className="container">
      <h1>SYNCHIRE <span>| Early Finish Mode</span></h1>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="stats">
        <div className="stat-card">
          <div className="stat-number">{totalStudents}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totalScheduled}</div>
          <div className="stat-label">Scheduled</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{unscheduledStudents}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.panels.length}</div>
          <div className="stat-label">Panels</div>
        </div>
      </div>

      <div className="dashboard">
        <div className="card">
          <h3>Add Student</h3>
          <input
            placeholder="Student Name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && addStudent()}
            disabled={loading}
          />
          <input
            placeholder="Grade (e.g., A, B+, 85%)"
            value={grade}
            onChange={e => setGrade(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && addStudent()}
            disabled={loading}
          />
          <button onClick={addStudent} disabled={loading}>
            {loading ? 'Saving...' : 'Save Student'}
          </button>
        </div>

        <div className="card">
          <h3>Add Panel</h3>
          <input
            placeholder="Panel Name (e.g., Technical Panel A)"
            value={pName}
            onChange={e => setPName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && addPanel()}
            disabled={loading}
          />
          <button onClick={addPanel} disabled={loading}>
            {loading ? 'Saving...' : 'Save Panel'}
          </button>
        </div>
        {/* Add this card right after your existing "Add Panel" card */}
        <div className="card">
          <h3>Delete Panel</h3>
          <select
            value={selectedPanelId}
            onChange={(e) => {
              const selectedId = parseInt(e.target.value);
              const panel = data.panels.find(p => p.panel_id === selectedId);
              setSelectedPanelId(selectedId);
              setSelectedPanelName(panel?.name || '');
            }}
            disabled={loading}
            className="panel-select"
          >
            <option value="">Select Panel to Delete</option>
            {data.panels.map(panel => (
              <option key={panel.panel_id} value={panel.panel_id}>
                {panel.name}
              </option>
            ))}
          </select>
          <button
            onClick={deletePanel}
            disabled={loading || !selectedPanelId}
            className="btn-delete"
          >
            {loading ? 'Deleting...' : '🗑️ Delete Panel'}
          </button>
          <small className="delete-note">
            ⚠️ Can only delete panels with NO scheduled interviews
          </small>
        </div>
      </div>

      <button
        className="btn-generate"
        onClick={generate}
        disabled={loading || totalStudents === 0}
      >
        {loading ? 'OPTIMIZING...' : 'OPTIMIZE & FILL SLOTS'}
      </button>

      <div className="card">
        <h3>Scheduled Interviews ({totalScheduled})</h3>
        {totalScheduled === 0 ? (
          <div className="empty-state">
            No interviews scheduled yet. Add students and panels, then click "OPTIMIZE & FILL SLOTS".
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Panel</th>
                <th>Student</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.interviews.map(i => (
                <tr key={i.interview_id}>
                  <td className="datetime">
                    {new Date(i.interview_datetime).toLocaleString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td><span className="panel-tag">{i.panel}</span></td>
                  <td>
                    {i.student}
                    <span className="grade-pill">{i.grade}</span>
                  </td>
                  <td>
                    <button
                      className="btn-tick"
                      onClick={() => finish(i.interview_id, i.student)}
                      disabled={loading}
                    >
                      ✓ Done
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;