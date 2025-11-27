-- Check current branch assignments
SELECT id, name, email, role, branch_id, branch_context 
FROM users 
WHERE role IN ('manager', 'staff', 'admin')
ORDER BY branch_id, role;

-- If manager and staff should be in the same branch but aren't,
-- update the staff's branch_id to match the manager's branch_id:
-- 
-- UPDATE users 
-- SET branch_id = (SELECT branch_id FROM users WHERE role = 'manager' LIMIT 1)
-- WHERE role = 'staff';

-- Or if you want all users in the same branch:
-- UPDATE users 
-- SET branch_id = 'your-branch-id-here'
-- WHERE branch_id IS NULL OR branch_id != 'your-branch-id-here';
