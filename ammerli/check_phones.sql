SELECT phone, role, first_name FROM users WHERE role = 'DRIVER' AND phone LIKE '06%' ORDER BY created_at DESC;
