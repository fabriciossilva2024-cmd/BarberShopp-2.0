-- ============================================
-- MIGRACAO: Supabase Auth Completa
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- PART 1: Functions para criar/auth users

CREATE OR REPLACE FUNCTION create_barber_auth_user(
  p_email text,
  p_password text,
  p_name text DEFAULT 'User',
  p_role text DEFAULT 'CLIENT'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'Email ja existe');
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated',
    p_email, crypt(p_password, gen_salt('bf')),
    now(), now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    json_build_object('sub', v_user_id, 'email', p_email),
    'email', p_email, now(), now(), now()
  );

  INSERT INTO profiles (id, name, role, email)
  VALUES (v_user_id, p_name, p_role, p_email)
  ON CONFLICT (id) DO UPDATE SET role = p_role, email = p_email;

  RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION update_auth_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- PART 2: Atualizar login_user para retornar auth_email

CREATE OR REPLACE FUNCTION login_user(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config app_config%rowtype;
  v_barber barbers%rowtype;
  v_auth_email text;
BEGIN
  SELECT * INTO v_config FROM app_config LIMIT 1;

  IF p_username = v_config.admin_username AND p_password = v_config.admin_password THEN
    SELECT email INTO v_auth_email FROM profiles WHERE role = 'ADMIN' LIMIT 1;
    RETURN json_build_object(
      'success', true, 'role', 'ADMIN',
      'user_id', 'admin',
      'auth_email', coalesce(v_auth_email, 'admin@barbershop.app')
    );
  END IF;

  IF v_config.caixa_username IS NOT NULL
     AND p_username = v_config.caixa_username
     AND p_password = v_config.caixa_password THEN
    SELECT email INTO v_auth_email FROM profiles WHERE role = 'CAIXA' LIMIT 1;
    RETURN json_build_object(
      'success', true, 'role', 'CAIXA',
      'user_id', 'caixa',
      'auth_email', coalesce(v_auth_email, 'caixa@barbershop.app')
    );
  END IF;

  SELECT b.* INTO v_barber
  FROM barbers b
  WHERE b.username = p_username AND b.password = p_password AND b.active = true
  LIMIT 1;

  IF FOUND THEN
    SELECT email INTO v_auth_email FROM profiles WHERE id = v_barber.profile_id;
    RETURN json_build_object(
      'success', true,
      'role', coalesce(v_barber.role, 'BARBER'),
      'user_id', v_barber.id::text,
      'auth_email', v_auth_email
    );
  END IF;

  RETURN json_build_object('success', false, 'error', 'Usuario ou senha invalidos');
END;
$$;

GRANT EXECUTE ON FUNCTION login_user(text, text) TO anon;
GRANT EXECUTE ON FUNCTION login_user(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_barber_auth_user(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_auth_password(uuid, text) TO authenticated;

-- PART 3: View segura

CREATE OR REPLACE VIEW app_config_public AS
SELECT id, name, address, phone, whatsapp,
       opening_hour, closing_hour, open_days,
       logo, primary_color, updated_at
FROM app_config;

GRANT SELECT ON app_config_public TO anon;
GRANT SELECT ON app_config_public TO authenticated;

-- PART 4: RLS Policies

DROP POLICY IF EXISTS "App config authenticated read" ON app_config;
DROP POLICY IF EXISTS "App config authenticated upsert" ON app_config;
DROP POLICY IF EXISTS "App config authenticated update" ON app_config;
DROP POLICY IF EXISTS "App config public read" ON app_config;
DROP POLICY IF EXISTS "App config admin read" ON app_config;
DROP POLICY IF EXISTS "App config admin update" ON app_config;
DROP POLICY IF EXISTS "App config admin insert" ON app_config;

CREATE POLICY "App config admin read" ON app_config FOR SELECT
  USING (auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

CREATE POLICY "App config admin update" ON app_config FOR UPDATE
  USING (auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

CREATE POLICY "App config admin insert" ON app_config FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

DROP POLICY IF EXISTS "Profiles authenticated read" ON profiles;
DROP POLICY IF EXISTS "Profiles own insert" ON profiles;
DROP POLICY IF EXISTS "Profiles own update" ON profiles;

CREATE POLICY "Profiles authenticated read" ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Profiles own insert" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles own update" ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Appointments authenticated read" ON appointments;
DROP POLICY IF EXISTS "Appointments authenticated insert" ON appointments;
DROP POLICY IF EXISTS "Appointments authenticated update" ON appointments;
DROP POLICY IF EXISTS "Appointments authenticated delete" ON appointments;

CREATE POLICY "Appointments authenticated read" ON appointments FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Appointments authenticated insert" ON appointments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Appointments authenticated update" ON appointments FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "Appointments authenticated delete" ON appointments FOR DELETE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Expenses authenticated read" ON expenses;
DROP POLICY IF EXISTS "Expenses authenticated insert" ON expenses;
DROP POLICY IF EXISTS "Expenses authenticated delete" ON expenses;

CREATE POLICY "Expenses authenticated read" ON expenses FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Expenses authenticated insert" ON expenses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Expenses authenticated delete" ON expenses FOR DELETE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Revenues authenticated read" ON revenues;
DROP POLICY IF EXISTS "Revenues authenticated insert" ON revenues;
DROP POLICY IF EXISTS "Revenues authenticated delete" ON revenues;

CREATE POLICY "Revenues authenticated read" ON revenues FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Revenues authenticated insert" ON revenues FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Revenues authenticated delete" ON revenues FOR DELETE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Clients authenticated read" ON clients;
DROP POLICY IF EXISTS "Clients authenticated insert" ON clients;
DROP POLICY IF EXISTS "Clients authenticated update" ON clients;
DROP POLICY IF EXISTS "Clients authenticated delete" ON clients;

CREATE POLICY "Clients authenticated read" ON clients FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Clients authenticated insert" ON clients FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Clients authenticated update" ON clients FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "Clients authenticated delete" ON clients FOR DELETE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Announcements public read" ON announcements;
DROP POLICY IF EXISTS "Announcements admin insert" ON announcements;
DROP POLICY IF EXISTS "Announcements admin delete" ON announcements;

CREATE POLICY "Announcements public read" ON announcements FOR SELECT USING (true);
CREATE POLICY "Announcements authenticated insert" ON announcements FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Announcements authenticated delete" ON announcements FOR DELETE
  USING (auth.role() = 'authenticated');

-- PART 5: Criar auth users para dados existentes

SELECT create_barber_auth_user(
  'admin@barbershop.app',
  (SELECT admin_password FROM app_config LIMIT 1),
  coalesce((SELECT name FROM app_config LIMIT 1), 'Admin'),
  'ADMIN'
);

SELECT create_barber_auth_user(
  'caixa@barbershop.app',
  (SELECT caixa_password FROM app_config LIMIT 1),
  'Caixa',
  'CAIXA'
);

DO $$
DECLARE
  b RECORD;
  v_email text;
BEGIN
  FOR b IN SELECT * FROM barbers WHERE active = true LOOP
    v_email := 'barber_' || replace(replace(lower(b.name), ' ', '_'), '.', '') || '@barbershop.app';
    PERFORM create_barber_auth_user(
      v_email,
      coalesce(b.password, 'mudar123'),
      b.name,
      coalesce(b.role, 'BARBER')
    );
    UPDATE barbers SET
      profile_id = (SELECT id FROM profiles WHERE email = v_email),
      email = v_email
    WHERE id = b.id;
  END LOOP;
END $$;
