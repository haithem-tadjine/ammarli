DELETE FROM "Clients" WHERE user_id = (SELECT id FROM users WHERE phone = '0696739465');
DELETE FROM users WHERE phone = '0696739465';
