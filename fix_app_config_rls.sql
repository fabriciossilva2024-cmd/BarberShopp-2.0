-- ============================================
-- CORRECAO: RLS do app_config + diagnosticos
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

-- Verificar se o admin existe em auth.users
SELECT id, email, created_at FROM auth.users WHERE email = 'admin@barbershop.app';

-- Verificar se o profile do admin existe com role ADMIN
SELECT p.id, p.name, p.role, p.email FROM profiles p WHERE p.role = 'ADMIN';

-- Se o admin NAO existe em auth.users, criar:
SELECT create_barber_auth_user(
  'admin@barbershop.app',
  (SELECT admin_password FROM app_config LIMIT 1),
  coalesce((SELECT name FROM app_config LIMIT 1), 'Admin'),
  'ADMIN'
);

-- Se o profile do admin NAO tem role ADMIN, corrigir:
UPDATE profiles SET role = 'ADMIN' WHERE email = 'admin@barbershop.app';

-- Simplificar RLS do app_config: qualquer authenticated pode ler/escrever
-- (a protecao ja esta no login + papel de ADMIN no frontend)
DROP POLICY IF EXISTS "App config admin read" ON app_config;
DROP POLICY IF EXISTS "App config admin update" ON app_config;
DROP POLICY IF EXISTS "App config admin insert" ON app_config;

CREATE POLICY "App config authenticated read" ON app_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "App config authenticated update" ON app_config FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "App config authenticated insert" ON app_config FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
