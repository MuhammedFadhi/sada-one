-- ============================================================
-- SA'DA HR — Migration 002: Tasks & Team Chat
-- ============================================================

-- ── ENUMS ──────────────────────────────────────────────────

CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'in_review', 'done', 'cancelled');
CREATE TYPE channel_type AS ENUM ('public', 'private', 'direct', 'announcement');
CREATE TYPE message_type AS ENUM ('text', 'file', 'image', 'system');

-- ============================================================
-- TASKS MODULE
-- ============================================================

CREATE TABLE task_projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  name          TEXT NOT NULL,
  description   TEXT,
  color         TEXT DEFAULT '#17B8D0',
  icon          TEXT DEFAULT 'briefcase',
  division_id   UUID REFERENCES divisions(id),
  owner_id      UUID REFERENCES employees(id),
  is_archived   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_project_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES task_projects(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES employees(id),
  role          TEXT DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, employee_id)
);

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID REFERENCES task_projects(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id),
  title           TEXT NOT NULL,
  description     TEXT,
  priority        task_priority DEFAULT 'normal',
  status          task_status DEFAULT 'todo',
  assignee_id     UUID REFERENCES employees(id),
  reporter_id     UUID NOT NULL REFERENCES employees(id),
  due_date        DATE,
  estimated_hours NUMERIC(5,2),
  actual_hours    NUMERIC(5,2),
  position        INT DEFAULT 0,             -- for kanban ordering
  parent_task_id  UUID REFERENCES tasks(id), -- subtasks
  tags            TEXT[],
  attachments     JSONB DEFAULT '[]',        -- [{name, url, size}]
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES employees(id),
  content     TEXT NOT NULL,
  mentions    UUID[],                         -- employee ids mentioned
  attachments JSONB DEFAULT '[]',
  is_edited   BOOLEAN DEFAULT FALSE,
  edited_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_activity (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES employees(id),
  action      TEXT NOT NULL,  -- 'created','status_changed','assigned','commented','due_date_changed'
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_watchers (
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  PRIMARY KEY (task_id, employee_id)
);

-- Auto-update task updated_at and log activity on status change
CREATE OR REPLACE FUNCTION task_status_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO task_activity(task_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, NEW.assignee_id, 'status_changed', OLD.status::TEXT, NEW.status::TEXT);
    IF NEW.status = 'done' THEN
      NEW.completed_at := NOW();
    END IF;
  END IF;
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO task_activity(task_id, actor_id, action, old_value, new_value)
    VALUES (NEW.id, NEW.reporter_id, 'assigned', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_activity_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION task_status_activity();

-- ============================================================
-- CHAT MODULE
-- ============================================================

CREATE TABLE chat_channels (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  name            TEXT,                              -- null for DMs
  description     TEXT,
  type            channel_type NOT NULL DEFAULT 'public',
  division_id     UUID REFERENCES divisions(id),    -- division-specific channels
  created_by      UUID NOT NULL REFERENCES employees(id),
  is_archived     BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  last_message    TEXT,                              -- preview
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_channel_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id  UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  is_admin    BOOLEAN DEFAULT FALSE,
  is_muted    BOOLEAN DEFAULT FALSE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, employee_id)
);

CREATE TABLE chat_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id    UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES employees(id),
  type          message_type DEFAULT 'text',
  content       TEXT,
  file_url      TEXT,
  file_name     TEXT,
  file_size     INT,
  reply_to_id   UUID REFERENCES chat_messages(id),  -- threaded replies
  mentions      UUID[],                              -- @mentioned employee ids
  reactions     JSONB DEFAULT '{}',                 -- {"👍": [emp_id,...]}
  is_edited     BOOLEAN DEFAULT FALSE,
  edited_at     TIMESTAMPTZ,
  is_deleted    BOOLEAN DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_message_reads (
  message_id  UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  read_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, employee_id)
);

-- Update channel last_message_at and preview on new message
CREATE OR REPLACE FUNCTION update_channel_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_channels SET
    last_message_at = NEW.created_at,
    last_message    = CASE WHEN NEW.type = 'text' THEN LEFT(NEW.content, 100) ELSE '📎 File' END
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channel_last_message_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_channel_last_message();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_tasks_project    ON tasks(project_id, status, position);
CREATE INDEX idx_tasks_assignee   ON tasks(assignee_id, status);
CREATE INDEX idx_tasks_due        ON tasks(due_date) WHERE status != 'done' AND due_date IS NOT NULL;
CREATE INDEX idx_task_comments    ON task_comments(task_id, created_at);
CREATE INDEX idx_messages_channel ON chat_messages(channel_id, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_messages_sender  ON chat_messages(sender_id, created_at DESC);
CREATE INDEX idx_channel_members  ON chat_channel_members(employee_id, channel_id);
CREATE INDEX idx_unread_messages  ON chat_channel_members(employee_id, last_read_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE task_projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity        ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_watchers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reads   ENABLE ROW LEVEL SECURITY;

-- Tasks: member of project OR assignee OR reporter OR admin/hr
CREATE POLICY "task_projects_select" ON task_projects FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM task_project_members WHERE project_id=id AND employee_id=current_employee_id())
    OR current_user_role() IN ('admin','hr_officer','director')
  );
CREATE POLICY "task_projects_insert" ON task_projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = current_employee_id() OR current_user_role() IN ('admin','hr_officer'));
CREATE POLICY "task_projects_update" ON task_projects FOR UPDATE TO authenticated
  USING (owner_id = current_employee_id() OR current_user_role() IN ('admin'));

CREATE POLICY "task_proj_members_select" ON task_project_members FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "task_proj_members_write"  ON task_project_members FOR ALL TO authenticated
  USING (employee_id = current_employee_id() OR current_user_role() IN ('admin','hr_officer'));

CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (
    assignee_id = current_employee_id()
    OR reporter_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM task_project_members WHERE project_id=tasks.project_id AND employee_id=current_employee_id())
    OR current_user_role() IN ('admin','hr_officer','director','manager')
  );
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (reporter_id = current_employee_id());
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (
    assignee_id = current_employee_id()
    OR reporter_id = current_employee_id()
    OR current_user_role() IN ('admin','hr_officer','manager')
  );

CREATE POLICY "task_comments_select" ON task_comments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = current_employee_id());
CREATE POLICY "task_comments_update" ON task_comments FOR UPDATE TO authenticated
  USING (author_id = current_employee_id());

CREATE POLICY "task_activity_select" ON task_activity FOR SELECT TO authenticated USING (TRUE);

-- Chat: only channel members can see messages
CREATE POLICY "channels_select" ON chat_channels FOR SELECT TO authenticated
  USING (
    type = 'public'
    OR EXISTS (SELECT 1 FROM chat_channel_members WHERE channel_id=id AND employee_id=current_employee_id())
    OR current_user_role() IN ('admin')
  );
CREATE POLICY "channels_insert" ON chat_channels FOR INSERT TO authenticated
  WITH CHECK (created_by = current_employee_id());
CREATE POLICY "channels_update" ON chat_channels FOR UPDATE TO authenticated
  USING (created_by = current_employee_id() OR current_user_role() = 'admin');

CREATE POLICY "channel_members_select" ON chat_channel_members FOR SELECT TO authenticated
  USING (
    employee_id = current_employee_id()
    OR EXISTS (SELECT 1 FROM chat_channel_members cm2 WHERE cm2.channel_id=channel_id AND cm2.employee_id=current_employee_id())
    OR current_user_role() = 'admin'
  );
CREATE POLICY "channel_members_write" ON chat_channel_members FOR ALL TO authenticated
  USING (employee_id = current_employee_id() OR current_user_role() IN ('admin'));

CREATE POLICY "messages_select" ON chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM chat_channel_members WHERE channel_id=chat_messages.channel_id AND employee_id=current_employee_id())
  );
CREATE POLICY "messages_insert" ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = current_employee_id()
    AND EXISTS (SELECT 1 FROM chat_channel_members WHERE channel_id=chat_messages.channel_id AND employee_id=current_employee_id())
  );
CREATE POLICY "messages_update" ON chat_messages FOR UPDATE TO authenticated
  USING (sender_id = current_employee_id());

CREATE POLICY "reads_select" ON chat_message_reads FOR SELECT TO authenticated
  USING (employee_id = current_employee_id());
CREATE POLICY "reads_insert" ON chat_message_reads FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id());

-- ============================================================
-- DEFAULT CHANNELS (run after seeding company)
-- ============================================================

-- General #general channel — all employees
INSERT INTO chat_channels (company_id, name, description, type, created_by)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  'general',
  'Company-wide announcements and news',
  'announcement',
  (SELECT id FROM employees LIMIT 1)
WHERE EXISTS (SELECT 1 FROM employees LIMIT 1);

-- #random channel
INSERT INTO chat_channels (company_id, name, description, type, created_by)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  'random',
  'Off-topic conversations and fun',
  'public',
  (SELECT id FROM employees LIMIT 1)
WHERE EXISTS (SELECT 1 FROM employees LIMIT 1);

-- Enable Realtime on chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_channel_members;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;

-- ============================================================
-- FIND DM CHANNEL FUNCTION
-- Used by useCreateDM to check for existing DMs before creating
-- ============================================================
CREATE OR REPLACE FUNCTION find_dm_channel(emp1 UUID, emp2 UUID)
RETURNS UUID AS $$
DECLARE
  channel_id UUID;
BEGIN
  SELECT c.id INTO channel_id
  FROM chat_channels c
  WHERE c.type = 'direct'
    AND EXISTS (SELECT 1 FROM chat_channel_members WHERE channel_id = c.id AND employee_id = emp1)
    AND EXISTS (SELECT 1 FROM chat_channel_members WHERE channel_id = c.id AND employee_id = emp2)
  LIMIT 1;
  RETURN channel_id;
END;
$$ LANGUAGE plpgsql;
