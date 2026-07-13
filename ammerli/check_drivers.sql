SELECT u.phone, u.role, u.first_name, d.type, d."waterType", d.capacity FROM users u LEFT JOIN drivers d ON d.user_id = u.id WHERE u.role = 'DRIVER' ORDER BY u.created_at DESC LIMIT 5;
