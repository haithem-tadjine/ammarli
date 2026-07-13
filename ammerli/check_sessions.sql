SELECT u.phone, u.role, s.created_at as session_created FROM session s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC LIMIT 10;
