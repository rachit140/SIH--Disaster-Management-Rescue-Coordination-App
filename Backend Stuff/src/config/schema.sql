CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('survivor','volunteer','coordinator','admin')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  last_seen TIMESTAMP DEFAULT now()
);

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL,
  source_device VARCHAR(100),
  source_user UUID REFERENCES users(id),
  priority VARCHAR(20) DEFAULT 'NORMAL',
  status VARCHAR(20) DEFAULT 'PENDING',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  payload JSONB,
  hop_count INT DEFAULT 0,
  ttl INT DEFAULT 8,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE rescue_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id),
  rescuer_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'ASSIGNED',
  assigned_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);