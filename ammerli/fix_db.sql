ALTER TABLE users DROP CONSTRAINT "UQ_user_phone";
ALTER TABLE users ADD CONSTRAINT "UQ_user_phone_role" UNIQUE (phone, role);
