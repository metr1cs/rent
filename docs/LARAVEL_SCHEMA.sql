-- VmestoRu MySQL schema draft for Laravel migration
-- MySQL 8+

CREATE TABLE categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE owners (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  trial_ends_at DATE NOT NULL,
  trial_status ENUM('active','expired') NOT NULL DEFAULT 'active',
  subscription_status ENUM('inactive','active') NOT NULL DEFAULT 'inactive',
  subscription_plan VARCHAR(100) NOT NULL DEFAULT 'monthly_2000',
  next_billing_date DATE NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE venues (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(50) NOT NULL UNIQUE,
  owner_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  region VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  category VARCHAR(255) NOT NULL,
  capacity INT UNSIGNED NOT NULL,
  area_sqm INT UNSIGNED NOT NULL,
  price_per_hour INT UNSIGNED NOT NULL,
  description TEXT NOT NULL,
  amenities_json JSON NOT NULL,
  images_json JSON NOT NULL,
  next_available_dates_json JSON NOT NULL,
  rating DECIMAL(3,1) NOT NULL DEFAULT 0.0,
  reviews_count INT UNSIGNED NOT NULL DEFAULT 0,
  instant_booking TINYINT(1) NOT NULL DEFAULT 0,
  metro_minutes INT UNSIGNED NOT NULL DEFAULT 10,
  cancellation_policy VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_venues_owner FOREIGN KEY (owner_id) REFERENCES owners(id),
  INDEX idx_venues_category_region_published (category, region, is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE lead_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(50) NOT NULL UNIQUE,
  venue_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  comment TEXT NOT NULL,
  status ENUM('new','in_progress','call_scheduled','confirmed','rejected') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_leads_venue FOREIGN KEY (venue_id) REFERENCES venues(id),
  INDEX idx_leads_venue_status_created (venue_id, status, created_at),
  INDEX idx_leads_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(50) NOT NULL UNIQUE,
  venue_id BIGINT UNSIGNED NOT NULL,
  author VARCHAR(255) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  text TEXT NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  requester_phone VARCHAR(60) NOT NULL,
  source_lead_request_id VARCHAR(50) NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('pending','published','hidden') NOT NULL DEFAULT 'pending',
  risk_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
  risk_flags_json JSON NOT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_reviews_venue FOREIGN KEY (venue_id) REFERENCES venues(id),
  INDEX idx_reviews_venue_status_created (venue_id, status, created_at),
  INDEX idx_reviews_requester_phone (requester_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE review_moderation_audit (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(50) NOT NULL UNIQUE,
  review_id VARCHAR(50) NOT NULL,
  venue_id VARCHAR(50) NOT NULL,
  previous_status ENUM('pending','published','hidden') NOT NULL,
  next_status ENUM('published','hidden') NOT NULL,
  note VARCHAR(400) NULL,
  moderator VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX idx_review_audit_review_created (review_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE support_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  message TEXT NOT NULL,
  page VARCHAR(400) NOT NULL,
  status ENUM('new','in_progress','resolved','rejected') NOT NULL DEFAULT 'new',
  assigned_to VARCHAR(120) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX idx_support_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(50) NOT NULL UNIQUE,
  owner_id BIGINT UNSIGNED NOT NULL,
  amount_rub INT UNSIGNED NOT NULL,
  period_days INT UNSIGNED NOT NULL,
  status ENUM('paid','failed') NOT NULL,
  paid_at TIMESTAMP NULL,
  next_billing_date DATE NOT NULL,
  method VARCHAR(50) NOT NULL DEFAULT 'mock',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_payments_owner FOREIGN KEY (owner_id) REFERENCES owners(id),
  INDEX idx_payments_owner_paid_at (owner_id, paid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE analytics_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(50) NOT NULL UNIQUE,
  event_name VARCHAR(80) NOT NULL,
  meta_json JSON NOT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX idx_analytics_event_created (event_name, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

