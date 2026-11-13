-- =====================================================================
-- CS2 Tournament Hub — schema MySQL 8+
--   mysql -u root -p < schema.sql
-- Torneios 100% gratuitos: não existe nenhuma coluna de prêmio/valor.
-- =====================================================================
CREATE DATABASE IF NOT EXISTS cs2hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cs2hub;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS trophies, match_player_stats, match_vetoes, matches,
  tournament_registrations, tournaments, team_invites_requests, team_members, teams, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------- users
CREATE TABLE users (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email            VARCHAR(160) NOT NULL UNIQUE,
  password_hash    VARCHAR(100) NOT NULL,
  nickname         VARCHAR(32)  NOT NULL UNIQUE,
  steam_id64       VARCHAR(20)  UNIQUE,
  avatar_url       VARCHAR(255),
  main_role        ENUM('IGL','AWPer','Entry Fragger','Rifler','Support','Lurker') NOT NULL DEFAULT 'Rifler',
  level            TINYINT UNSIGNED NOT NULL DEFAULT 1,
  looking_for_team BOOLEAN NOT NULL DEFAULT FALSE,           -- LFT
  matches_played   INT UNSIGNED NOT NULL DEFAULT 0,
  matches_won      INT UNSIGNED NOT NULL DEFAULT 0,
  total_kills      INT UNSIGNED NOT NULL DEFAULT 0,
  total_deaths     INT UNSIGNED NOT NULL DEFAULT 0,
  total_assists    INT UNSIGNED NOT NULL DEFAULT 0,
  total_hs_kills   INT UNSIGNED NOT NULL DEFAULT 0,          -- K/D, HS% derivados no ORM
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_lft (looking_for_team, main_role)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------- teams
CREATE TABLE teams (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(40) NOT NULL UNIQUE,
  tag                 VARCHAR(5)  NOT NULL UNIQUE,
  logo_url            VARCHAR(255),
  description         VARCHAR(500),
  captain_id          INT UNSIGNED NOT NULL,
  looking_for_players BOOLEAN NOT NULL DEFAULT FALSE,        -- LFP
  recruiting_roles    JSON NULL,                             -- ["AWPer","Support"]
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_team_captain FOREIGN KEY (captain_id) REFERENCES users(id),
  INDEX idx_teams_lfp (looking_for_players)
) ENGINE=InnoDB;

CREATE TABLE team_members (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  team_id       INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED NOT NULL UNIQUE,                -- 1 jogador = 1 time
  tactical_role ENUM('IGL','AWPer','Entry Fragger','Rifler','Support','Lurker') NOT NULL DEFAULT 'Rifler',
  is_captain    BOOLEAN NOT NULL DEFAULT FALSE,
  is_starter    BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Convites (capitão -> jogador) e solicitações (jogador -> time)
CREATE TABLE team_invites_requests (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kind        ENUM('INVITE','REQUEST') NOT NULL,
  team_id     INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  tactical_role ENUM('IGL','AWPer','Entry Fragger','Rifler','Support','Lurker') NULL,
  message     VARCHAR(255),
  status      ENUM('PENDING','ACCEPTED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  CONSTRAINT fk_tir_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_tir_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tir_user (user_id, status),
  INDEX idx_tir_team (team_id, status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------- tournaments
CREATE TABLE tournaments (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template_id    VARCHAR(40)  NOT NULL,                       -- gsl-playoffs | swiss-playoffs | round-robin-playoffs
  room_number    INT UNSIGNED NOT NULL DEFAULT 1,             -- fila contínua: #1, #2, #3...
  title          VARCHAR(80)  NOT NULL,
  format         ENUM('GSL','SWISS','ROUND_ROBIN') NOT NULL,  -- fase 1 (a fase 2 é sempre playoffs)
  status         ENUM('REGISTRATION','RUNNING','FINISHED') NOT NULL DEFAULT 'REGISTRATION',
  max_teams      TINYINT UNSIGNED NOT NULL,
  bo_group       TINYINT UNSIGNED NOT NULL DEFAULT 3,
  bo_playoffs    TINYINT UNSIGNED NOT NULL DEFAULT 3,
  bo_final       TINYINT UNSIGNED NOT NULL DEFAULT 5,
  banner_url     VARCHAR(255),
  rules          TEXT,
  trophy_name    VARCHAR(80)  NOT NULL,                       -- identidade visual própria do troféu
  trophy_icon    VARCHAR(20)  NOT NULL DEFAULT 'trophy',      -- trophy | crown | star | shield | flame
  trophy_color   CHAR(7)      NOT NULL DEFAULT '#de9b35',
  champion_team_id INT UNSIGNED NULL,
  mvp_user_id      INT UNSIGNED NULL,
  started_at     TIMESTAMP NULL,
  finished_at    TIMESTAMP NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_t_champion FOREIGN KEY (champion_team_id) REFERENCES teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_t_mvp FOREIGN KEY (mvp_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_template_room (template_id, room_number),
  INDEX idx_t_status (status)
) ENGINE=InnoDB;

CREATE TABLE tournament_registrations (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id  INT UNSIGNED NOT NULL,
  team_id        INT UNSIGNED NOT NULL,
  seed           TINYINT UNSIGNED NULL,
  group_name     VARCHAR(10) NULL,
  lineup         JSON NOT NULL,                               -- snapshot dos titulares na inscrição
  registered_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tr_t FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT fk_tr_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE KEY uq_reg (tournament_id, team_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------------- matches
CREATE TABLE matches (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id   INT UNSIGNED NOT NULL,
  stage           ENUM('GROUP','SWISS','PLAYOFF') NOT NULL,
  round_label     VARCHAR(40) NOT NULL,                       -- "Upper Opening", "Quartas", "Grande Final"...
  round_number    TINYINT UNSIGNED NOT NULL DEFAULT 1,
  position        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  group_name      VARCHAR(10) NULL,
  bo              TINYINT UNSIGNED NOT NULL DEFAULT 3,
  team1_id        INT UNSIGNED NULL,
  team2_id        INT UNSIGNED NULL,
  team1_score     TINYINT UNSIGNED NOT NULL DEFAULT 0,        -- mapas vencidos
  team2_score     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  winner_team_id  INT UNSIGNED NULL,
  status          ENUM('WAITING_TEAMS','READY','VETO','LIVE','AWAITING_CONFIRMATION','DISPUTED','FINISHED')
                  NOT NULL DEFAULT 'WAITING_TEAMS',
  next_match_id        INT UNSIGNED NULL,                     -- vencedor avança
  next_slot            TINYINT UNSIGNED NULL,                 -- 1 ou 2
  loser_next_match_id  INT UNSIGNED NULL,                     -- GSL: perdedor cai pro lower
  loser_next_slot      TINYINT UNSIGNED NULL,
  map_results     JSON NULL,                                  -- [{map, team1Rounds, team2Rounds, winnerTeamId}]
  pending_result  JSON NULL,                                  -- OCR aguardando confirmação do capitão adversário
  submitted_by_team_id INT UNSIGNED NULL,
  screenshot_url  VARCHAR(255) NULL,
  scheduled_at    TIMESTAMP NULL,
  finished_at     TIMESTAMP NULL,
  CONSTRAINT fk_m_t FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT fk_m_t1 FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_m_t2 FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_m_w  FOREIGN KEY (winner_team_id) REFERENCES teams(id) ON DELETE SET NULL,
  INDEX idx_m_t (tournament_id, stage, round_number)
) ENGINE=InnoDB;

CREATE TABLE match_vetoes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id    INT UNSIGNED NOT NULL,
  step_order  TINYINT UNSIGNED NOT NULL,
  team_id     INT UNSIGNED NULL,                              -- NULL no DECIDER automático
  action      ENUM('BAN','PICK','DECIDER','SIDE') NOT NULL,
  map_name    VARCHAR(20) NOT NULL,
  side        ENUM('CT','TR') NULL,                           -- só em SIDE
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mv_m FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  UNIQUE KEY uq_step (match_id, step_order)
) ENGINE=InnoDB;

CREATE TABLE match_player_stats (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id      INT UNSIGNED NOT NULL,
  map_number    TINYINT UNSIGNED NOT NULL DEFAULT 1,
  user_id       INT UNSIGNED NOT NULL,
  team_id       INT UNSIGNED NOT NULL,
  kills         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  deaths        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  assists       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  adr           DECIMAL(5,1) NOT NULL DEFAULT 0,
  hs_percentage DECIMAL(4,1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_mps_m FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_mps_u FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mps_t FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE KEY uq_mps (match_id, map_number, user_id),
  INDEX idx_mps_user (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------- trophies
-- Uma linha por destinatário: user_id NULL = troféu do time; preenchido = jogador.
CREATE TABLE trophies (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT UNSIGNED NOT NULL,
  kind          ENUM('CHAMPION','MVP') NOT NULL DEFAULT 'CHAMPION',
  team_id       INT UNSIGNED NULL,
  user_id       INT UNSIGNED NULL,
  awarded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tro_t FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT fk_tro_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_tro_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_tro_owner CHECK (team_id IS NOT NULL OR user_id IS NOT NULL),
  UNIQUE KEY uq_trophy (tournament_id, kind, team_id, user_id),
  INDEX idx_tro_user (user_id), INDEX idx_tro_team (team_id)
) ENGINE=InnoDB;

-- ------------------------------------------------- salas iniciais (seed)
INSERT INTO tournaments
 (template_id, room_number, title, format, max_teams, bo_group, bo_playoffs, bo_final, banner_url, rules,
  trophy_name, trophy_icon, trophy_color) VALUES
 ('gsl-playoffs', 1, 'Copa GSL Pro Series #1', 'GSL', 8, 3, 3, 5,
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
  'Dois grupos de 4 em formato GSL (MD3). Os 2 melhores de cada grupo avançam aos Playoffs (Semifinais MD3 e Grande Final MD5). Torneio gratuito: vale prestígio e troféu exclusivo.',
  'Taça GSL Pro Series', 'trophy', '#de9b35'),
 ('swiss-playoffs', 1, 'Major Swiss Qualifier #1', 'SWISS', 16, 1, 3, 5,
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
  'Fase Suíça com 16 equipes: 3 vitórias classificam, 3 derrotas eliminam (decisivas em MD3). Os 8 classificados jogam mata-mata. Torneio gratuito: vale prestígio e troféu exclusivo.',
  'Coroa Major Swiss', 'crown', '#38bdf8'),
 ('round-robin-playoffs', 1, 'Liga Pontos Corridos #1', 'ROUND_ROBIN', 12, 3, 3, 5,
  'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
  '2 grupos de 6 equipes, todos contra todos (MD3). Os 4 melhores de cada grupo avançam aos Playoffs. Torneio gratuito: vale prestígio e troféu exclusivo.',
  'Escudo da Liga', 'shield', '#a78bfa');
