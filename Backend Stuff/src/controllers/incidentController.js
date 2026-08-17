const pool = require('../config/db');

// Create a single SOS (used when device is online)
async function createSOS(req, res) {
  try {
    const { message_id, latitude, longitude, message, priority } = req.body;

    if (!message_id || !latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'message_id, latitude, longitude are required' });
    }

    // Deduplication check
    const existing = await pool.query('SELECT id FROM incidents WHERE message_id = $1', [message_id]);
    if (existing.rows.length > 0) {
      return res.status(200).json({ success: true, message: 'Already exists', duplicate: true });
    }

    const result = await pool.query(
      `INSERT INTO incidents (message_id, type, source_user, priority, latitude, longitude, payload)
       VALUES ($1, 'SOS', $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        message_id,
        req.user ? req.user.id : null,
        priority || 'CRITICAL',
        latitude,
        longitude,
        JSON.stringify({ message: message || '' }),
      ]
    );

    const incident = result.rows[0];

    // Broadcast to dashboard in real time
    const io = req.app.get('io');
    io.emit('new_sos', incident);

    res.status(201).json({ success: true, incident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

// Batch sync offline events (the core offline->online bridge)
async function syncEvents(req, res) {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, error: 'events array is required' });
    }

    const io = req.app.get('io');
    const results = [];

    for (const event of events) {
      const { message_id, type, source_device, source_user, priority, latitude, longitude, payload, hop_count, ttl } = event;

      if (!message_id) {
        results.push({ message_id: null, status: 'skipped', reason: 'missing message_id' });
        continue;
      }

      // Deduplication check
      const existing = await pool.query('SELECT id FROM incidents WHERE message_id = $1', [message_id]);
      if (existing.rows.length > 0) {
        results.push({ message_id, status: 'duplicate' });
        continue;
      }

      const result = await pool.query(
        `INSERT INTO incidents (message_id, type, source_device, source_user, priority, latitude, longitude, payload, hop_count, ttl)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          message_id,
          type || 'SOS',
          source_device || null,
          source_user || null,
          priority || 'NORMAL',
          latitude || null,
          longitude || null,
          JSON.stringify(payload || {}),
          hop_count || 0,
          ttl || 8,
        ]
      );

      const incident = result.rows[0];
      io.emit('new_sos', incident);
      results.push({ message_id, status: 'created', incident_id: incident.id });
    }

    res.status(200).json({ success: true, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

// Get all incidents (for dashboard)
async function getIncidents(req, res) {
  try {
    const { status, priority } = req.query;
    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      query += ` AND priority = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, incidents: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

// Update incident status
async function updateIncidentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESCUED', 'RESOLVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE incidents SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const incident = result.rows[0];
    const io = req.app.get('io');
    io.emit('incident_updated', incident);

    res.json({ success: true, incident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}
// Volunteer accepts a rescue task
async function acceptRescue(req, res) {
  try {
    const { incidentId } = req.params;
    const rescuerId = req.user.id;

    const incident = await pool.query('SELECT * FROM incidents WHERE id = $1', [incidentId]);
    if (incident.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const result = await pool.query(
      `INSERT INTO rescue_assignments (incident_id, rescuer_id, status)
       VALUES ($1, $2, 'ASSIGNED')
       RETURNING *`,
      [incidentId, rescuerId]
    );

    await pool.query(
      `UPDATE incidents SET status = 'ASSIGNED', updated_at = now() WHERE id = $1`,
      [incidentId]
    );

    const io = req.app.get('io');
    io.emit('incident_updated', { id: incidentId, status: 'ASSIGNED' });

    res.status(201).json({ success: true, assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

// Volunteer updates rescue progress
async function updateRescueStatus(req, res) {
  try {
    const { incidentId } = req.params;
    const { status } = req.body;

    const validStatuses = ['ASSIGNED', 'IN_PROGRESS', 'RESCUED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE rescue_assignments SET status = $1, updated_at = now()
       WHERE incident_id = $2 AND rescuer_id = $3
       RETURNING *`,
      [status, incidentId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    const incidentStatus = status === 'RESCUED' ? 'RESCUED' : 'IN_PROGRESS';
    await pool.query(
      `UPDATE incidents SET status = $1, updated_at = now() WHERE id = $2`,
      [incidentStatus, incidentId]
    );

    const io = req.app.get('io');
    io.emit('incident_updated', { id: incidentId, status: incidentStatus });

    res.json({ success: true, assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}

// Find nearby SOS (simple bounding box, good enough for MVP)
async function getNearbySOS(req, res) {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'latitude and longitude required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const r = radius ? parseFloat(radius) : 0.1; // ~11km default box

    const result = await pool.query(
      `SELECT * FROM incidents
       WHERE status = 'PENDING'
       AND latitude BETWEEN $1 AND $2
       AND longitude BETWEEN $3 AND $4
       ORDER BY created_at DESC`,
      [lat - r, lat + r, lng - r, lng + r]
    );

    res.json({ success: true, incidents: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}
module.exports = { createSOS, syncEvents, getIncidents, updateIncidentStatus, acceptRescue, updateRescueStatus, getNearbySOS };