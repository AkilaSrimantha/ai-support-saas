-- AI-Driven SaaS Customer Support & Ticketing System
-- MySQL 8.0+ Schema

CREATE DATABASE IF NOT EXISTS ai_support_saas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ai_support_saas;

-- 1. SaaS Tenants (Admins & Human Agents)
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'agent') NOT NULL DEFAULT 'admin',
  is_online TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tenant Chatbots & Widget Customization
CREATE TABLE IF NOT EXISTS bots (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL DEFAULT 'Support AI',
  bot_key VARCHAR(64) NOT NULL UNIQUE,
  primary_color VARCHAR(20) NOT NULL DEFAULT '#4f46e5',
  welcome_message VARCHAR(500) NOT NULL DEFAULT 'Hi! 👋 How can I help you today?',
  position ENUM('bottom-right', 'bottom-left') NOT NULL DEFAULT 'bottom-right',
  allowed_domains TEXT NULL COMMENT 'Comma-separated hostnames, or * / empty for any domain',
  system_prompt TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bots_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Knowledge Base Sources (Scraped URLs & Manual FAQs)
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bot_id INT UNSIGNED NOT NULL,
  source_type ENUM('url', 'faq') NOT NULL DEFAULT 'url',
  url VARCHAR(1024) NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('pending', 'trained', 'failed') NOT NULL DEFAULT 'pending',
  chunk_count INT UNSIGNED NOT NULL DEFAULT 0,
  error_message VARCHAR(500) NULL,
  last_scraped_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sources_bot FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  INDEX idx_sources_bot (bot_id)
) ENGINE=InnoDB;

-- 4. Chunked Knowledge Content for RAG Retrieval
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_id INT UNSIGNED NOT NULL,
  bot_id INT UNSIGNED NOT NULL,
  chunk_index INT UNSIGNED NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  keywords VARCHAR(500) NULL,
  embedding_json LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chunks_source FOREIGN KEY (source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  CONSTRAINT fk_chunks_bot FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  INDEX idx_chunks_bot (bot_id)
) ENGINE=InnoDB;

-- 5. Visitor Chat Sessions
CREATE TABLE IF NOT EXISTS chats (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bot_id INT UNSIGNED NOT NULL,
  visitor_id VARCHAR(100) NOT NULL,
  visitor_name VARCHAR(120) NULL DEFAULT 'Website Visitor',
  visitor_email VARCHAR(190) NULL,
  page_url VARCHAR(1024) NULL,
  status ENUM('ai_active', 'human_handoff', 'resolved') NOT NULL DEFAULT 'ai_active',
  assigned_agent_id INT UNSIGNED NULL,
  sentiment ENUM('happy', 'neutral', 'angry') NOT NULL DEFAULT 'neutral',
  sentiment_score DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  handoff_reason VARCHAR(255) NULL,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chats_bot FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  CONSTRAINT fk_chats_agent FOREIGN KEY (assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_bot_visitor (bot_id, visitor_id),
  INDEX idx_chats_bot_status (bot_id, status),
  INDEX idx_chats_sentiment (bot_id, sentiment)
) ENGINE=InnoDB;

-- 6. Chat Messages (Visitor, AI, Human Agent, System)
CREATE TABLE IF NOT EXISTS messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chat_id INT UNSIGNED NOT NULL,
  sender_type ENUM('visitor', 'ai', 'agent', 'system') NOT NULL,
  sender_id INT UNSIGNED NULL,
  content TEXT NOT NULL,
  sentiment ENUM('happy', 'neutral', 'angry') NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  INDEX idx_messages_chat_created (chat_id, created_at)
) ENGINE=InnoDB;

-- 7. Support Tickets (Created on AI Escalation or Manual Agent Action)
CREATE TABLE IF NOT EXISTS tickets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bot_id INT UNSIGNED NOT NULL,
  chat_id INT UNSIGNED NULL,
  visitor_name VARCHAR(120) NULL DEFAULT 'Website Visitor',
  visitor_email VARCHAR(190) NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  sentiment ENUM('happy', 'neutral', 'angry') NOT NULL DEFAULT 'neutral',
  assigned_agent_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tickets_bot FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  CONSTRAINT fk_tickets_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_agent FOREIGN KEY (assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tickets_bot_status (bot_id, status)
) ENGINE=InnoDB;
