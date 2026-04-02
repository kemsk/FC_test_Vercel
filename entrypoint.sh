#!/bin/bash

mkdir -p /app/staticfiles/frontend
cp -r /app/frontend_dist/* /app/staticfiles/frontend/

mkdir -p /app/static

echo "Waiting for MySQL TCP port at ${DB_HOST}:${DB_PORT:-3306}..."
until bash -c "</dev/tcp/${DB_HOST}/${DB_PORT:-3306}" >/dev/null 2>&1; do
  echo "MySQL is unavailable - retrying in 2 seconds..."
  sleep 2
done

# Create database if it doesn't exist
echo "Creating database ${DB_NAME} if it doesn't exist..."
mysql -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" --ssl=0 -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || echo "Database creation failed or already exists"

python manage.py collectstatic --noinput
python manage.py makemigrations --noinput

until python manage.py migrate --noinput; do
  echo "Django migration failed because database is not fully ready - retrying in 2 seconds..."
  sleep 2
done

mysql -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" --ssl=0 "${DB_NAME}" << 'EOF'
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_unicode_ci';

-- Seed Users
INSERT INTO FC_user (email, university_id, first_name, last_name, created_at)
VALUES 
('20220025546@my.xu.edu.ph', 20220025546, 'Albert Floyd', 'Villanueva', NOW()),
('20190016375@my.xu.edu.ph', 20190016375, 'Nesyl', 'Ylanan', NOW()),
('201131134@my.xu.edu.ph', 201131134, 'Farrah', 'Apag', NOW()),
('20220024573@my.xu.edu.ph', 20220024573, 'Kim', 'Flores', NOW()),
('approver.seed@xu.edu.ph', 1000000001, 'Angela', 'Santos', NOW()),
('assistant.seed@xu.edu.ph', 1000000002, 'Seed', 'Assistant', NOW()),
('faculty.seed@xu.edu.ph', 1000000003, 'John', 'Doe', NOW()),
('ovphe.seed@xu.edu.ph', 1000000005, 'Maria', 'Reyes', NOW())
ON DUPLICATE KEY UPDATE
    first_name = VALUES(first_name),
    last_name = VALUES(last_name);

-- Seed Roles
INSERT INTO FC_role (name, description, is_system_role, created_at)
SELECT * FROM (
    SELECT 'CISO' AS name, 'CISO System Administrator' AS description, 1 AS is_system_role, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_role r WHERE r.name = v.name
);

INSERT INTO FC_role (name, description, is_system_role, created_at)
SELECT * FROM (
    SELECT 'OVPHE' AS name, 'OVPHE System Administrator' AS description, 1 AS is_system_role, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_role r WHERE r.name = v.name
);

INSERT INTO FC_role (name, description, is_system_role, created_at)
SELECT * FROM (
    SELECT 'Approver' AS name, 'Approver (handles college, department, and office contexts)' AS description, 1 AS is_system_role, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_role r WHERE r.name = v.name
);

INSERT INTO FC_role (name, description, is_system_role, created_at)
SELECT * FROM (
    SELECT 'Student Assistant' AS name, 'Student Assistant' AS description, 1 AS is_system_role, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_role r WHERE r.name = v.name
);

INSERT INTO FC_role (name, description, is_system_role, created_at)
SELECT * FROM (
    SELECT 'Faculty' AS name, 'Faculty Member' AS description, 1 AS is_system_role, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_role r WHERE r.name = v.name
);

-- Seed UserRoles for admin users
INSERT INTO FC_userrole (user_id, role_id, assigned_by_id, assigned_date, is_active)
SELECT * FROM (
    SELECT 
        u.id AS user_id, 
        r.id AS role_id,
        u.id AS assigned_by_id,
        NOW() AS assigned_date,
        1 AS is_active
    FROM FC_user u
    CROSS JOIN FC_role r
    WHERE u.email = '201131134@my.xu.edu.ph'
) AS v
WHERE NOT EXISTS (
    SELECT 1
    FROM FC_userrole ur
    WHERE ur.user_id = v.user_id
      AND ur.role_id = v.role_id
      AND ur.college_id IS NULL
      AND ur.department_id IS NULL
      AND ur.office_id IS NULL
);

INSERT INTO FC_userrole (user_id, role_id, assigned_by_id, assigned_date, is_active)
SELECT 
    u.id AS user_id, 
    r.id AS role_id,
    u.id AS assigned_by_id,
    NOW() AS assigned_date,
    1 AS is_active
FROM FC_user u
CROSS JOIN FC_role r
WHERE u.email = '20220024573@my.xu.edu.ph' AND r.name = 'CISO'
ON DUPLICATE KEY UPDATE
    is_active = VALUES(is_active);

INSERT INTO FC_userrole (user_id, role_id, assigned_by_id, assigned_date, is_active)
SELECT 
    u.id AS user_id, 
    r.id AS role_id,
    u.id AS assigned_by_id,
    NOW() AS assigned_date,
    1 AS is_active
FROM FC_user u
CROSS JOIN FC_role r
WHERE u.email = '20220025546@my.xu.edu.ph' AND r.name = 'CISO'
ON DUPLICATE KEY UPDATE
    is_active = VALUES(is_active);

INSERT INTO FC_userrole (user_id, role_id, assigned_by_id, assigned_date, is_active)
SELECT 
    u.id AS user_id, 
    r.id AS role_id,
    u.id AS assigned_by_id,
    NOW() AS assigned_date,
    1 AS is_active
FROM FC_user u
CROSS JOIN FC_role r
WHERE u.email = '20190016375@my.xu.edu.ph' AND r.name = 'OVPHE'
ON DUPLICATE KEY UPDATE
    is_active = VALUES(is_active);

INSERT INTO FC_userrole (user_id, role_id, assigned_by_id, assigned_date, is_active)
SELECT 
    u.id AS user_id, 
    r.id AS role_id,
    u.id AS assigned_by_id,
    NOW() AS assigned_date,
    1 AS is_active
FROM FC_user u
CROSS JOIN FC_role r
WHERE u.email = '20220024573@my.xu.edu.ph' AND r.name = 'OVPHE'
ON DUPLICATE KEY UPDATE
    is_active = VALUES(is_active);

-- Seed UserRoles for other users
INSERT INTO FC_userrole (user_id, role_id, college_id, department_id, assigned_by_id, assigned_date, is_active)
SELECT 
    u.id AS user_id, 
    r.id AS role_id,
    @ccs_id AS college_id,
    @cs_id AS department_id,
    u.id AS assigned_by_id,
    NOW() AS assigned_date,
    1 AS is_active
FROM FC_user u
CROSS JOIN FC_role r
WHERE u.email = 'approver.seed@xu.edu.ph' AND r.name = 'Approver'
ON DUPLICATE KEY UPDATE
    is_active = VALUES(is_active);

INSERT INTO FC_userrole (user_id, role_id, college_id, department_id, assigned_by_id, assigned_date, is_active)
SELECT 
    u.id AS user_id, 
    r.id AS role_id,
    @ccs_id AS college_id,
    @cs_id AS department_id,
    @ciso_user_id AS assigned_by_id,
    NOW() AS assigned_date,
    1 AS is_active
FROM FC_user u
CROSS JOIN FC_role r
WHERE u.email = '20220024573@my.xu.edu.ph' AND r.name = 'Approver'
ON DUPLICATE KEY UPDATE
    is_active = VALUES(is_active);

-- Seed UserRole for Approver for main user (20220025546@my.xu.edu.ph)
INSERT INTO FC_userrole (user_id, role_id, college_id, department_id, assigned_by_id, assigned_date, is_active)
SELECT 
    u.id AS user_id, 
    r.id AS role_id,
    @ccs_id AS college_id,
    @it_id AS department_id,
    @ciso_user_id AS assigned_by_id,
    NOW() AS assigned_date,
    1 AS is_active
FROM FC_user u
CROSS JOIN FC_role r
WHERE u.email = '20220025546@my.xu.edu.ph' AND r.name = 'Approver'
ON DUPLICATE KEY UPDATE
    is_active = VALUES(is_active);

INSERT INTO FC_userrole (user_id, role_id, college_id, department_id, assigned_by_id, assigned_date, is_active)
SELECT 
    u.id AS user_id, 
    r.id AS role_id,
    @ccs_id AS college_id,
    @cs_id AS department_id,
    @approver_user_id AS assigned_by_id,
    NOW() AS assigned_date,
    1 AS is_active
FROM FC_user u
CROSS JOIN FC_role r
WHERE u.email = '20220024573@my.xu.edu.ph' AND r.name = 'Student Assistant'
ON DUPLICATE KEY UPDATE
    is_active = VALUES(is_active);

INSERT INTO FC_userrole (user_id, role_id, college_id, department_id, assigned_by_id, assigned_date, is_active)
SELECT 
    u.id AS user_id, 
    r.id AS role_id,
    @ccs_id AS college_id,
    @it_id AS department_id,
    @ciso_user_id AS assigned_by_id,
    NOW() AS assigned_date,
    1 AS is_active
FROM FC_user u
CROSS JOIN FC_role r
WHERE u.email = '20220025546@my.xu.edu.ph' AND r.name = 'Student Assistant'
ON DUPLICATE KEY UPDATE
    is_active = VALUES(is_active);

INSERT INTO FC_userrole (user_id, role_id, assigned_by_id, assigned_date, is_active)
SELECT 
    u.id AS user_id, 
    r.id AS role_id,
    u.id AS assigned_by_id,
    NOW() AS assigned_date,
    1 AS is_active
FROM FC_user u
CROSS JOIN FC_role r
WHERE u.email = '20220024573@my.xu.edu.ph' AND r.name = 'Faculty'
ON DUPLICATE KEY UPDATE
    is_active = VALUES(is_active);

-- Seed Colleges
INSERT INTO FC_college (name, abbreviation, is_active)
SELECT * FROM (
    SELECT 'College of Agriculture' AS name, 'COA' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_college c WHERE c.abbreviation = v.abbreviation
);

INSERT INTO FC_college (name, abbreviation, is_active)
SELECT * FROM (
    SELECT 'College of Arts and Sciences' AS name, 'CAS' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_college c WHERE c.abbreviation = v.abbreviation
);

INSERT INTO FC_college (name, abbreviation, is_active)
SELECT * FROM (
    SELECT 'College of Computer Studies' AS name, 'CCS' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_college c WHERE c.abbreviation = v.abbreviation
);

INSERT INTO FC_college (name, abbreviation, is_active)
SELECT * FROM (
    SELECT 'College of Engineering' AS name, 'COE' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_college c WHERE c.abbreviation = v.abbreviation
);

INSERT INTO FC_college (name, abbreviation, is_active)
SELECT * FROM (
    SELECT 'College of Nursing' AS name, 'CON' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_college c WHERE c.abbreviation = v.abbreviation
);

INSERT INTO FC_college (name, abbreviation, is_active)
SELECT * FROM (
    SELECT 'School of Business and Management' AS name, 'SBM' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_college c WHERE c.abbreviation = v.abbreviation
);

INSERT INTO FC_college (name, abbreviation, is_active)
SELECT * FROM (
    SELECT 'School of Education' AS name, 'SOE' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_college c WHERE c.abbreviation = v.abbreviation
);

INSERT INTO FC_college (name, abbreviation, is_active)
SELECT * FROM (
    SELECT 'School of Law' AS name, 'SOL' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_college c WHERE c.abbreviation = v.abbreviation
);

INSERT INTO FC_college (name, abbreviation, is_active)
SELECT * FROM (
    SELECT 'School of Medicine' AS name, 'SOM' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_college c WHERE c.abbreviation = v.abbreviation
);

-- Get college IDs
SET @coa_id = (SELECT id FROM FC_college WHERE abbreviation = 'COA' LIMIT 1);
SET @cas_id = (SELECT id FROM FC_college WHERE abbreviation = 'CAS' LIMIT 1);
SET @ccs_id = (SELECT id FROM FC_college WHERE abbreviation = 'CCS' LIMIT 1);
SET @coe_id = (SELECT id FROM FC_college WHERE abbreviation = 'COE' LIMIT 1);
SET @con_id = (SELECT id FROM FC_college WHERE abbreviation = 'CON' LIMIT 1);
SET @sbm_id = (SELECT id FROM FC_college WHERE abbreviation = 'SBM' LIMIT 1);
SET @soe_id = (SELECT id FROM FC_college WHERE abbreviation = 'SOE' LIMIT 1);
SET @sol_id = (SELECT id FROM FC_college WHERE abbreviation = 'SOL' LIMIT 1);
SET @som_id = (SELECT id FROM FC_college WHERE abbreviation = 'SOM' LIMIT 1);

-- Seed Departments for College of Agriculture (COA)
INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coa_id AS college_id, 'College of Agriculture Dean' AS name, 'COA_DEAN' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coa_id AS college_id, 'Agricultural Sciences' AS name, 'AGRI' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coa_id AS college_id, 'Agricultural Business' AS name, 'AGBUS' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coa_id AS college_id, 'Agriculture and Biosystems Engineering' AS name, 'AGBENG' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coa_id AS college_id, 'Food Technology' AS name, 'FOODTECH' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

-- Seed Departments for College of Arts and Sciences (CAS)
INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'College of Arts and Sciences Dean' AS name, 'CAS_DEAN' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'Biology' AS name, 'BIO' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'Chemistry' AS name, 'CHEM' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'Development Communications' AS name, 'DEVCOM' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'Economics' AS name, 'ECON' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'English' AS name, 'ENG' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'General Education & Integrated Discipline Studies' AS name, 'GEIDS' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'International Studies' AS name, 'IS' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'Math' AS name, 'MATH' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'Philosophy' AS name, 'PHIL' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'Physics' AS name, 'PHYS' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'Psychology' AS name, 'PSYCH' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'Sociology' AS name, 'SOCIO' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @cas_id AS college_id, 'Theology' AS name, 'THEO' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

-- Seed Departments for College of Computer Studies (CCS)
INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @ccs_id AS college_id, 'College of Computer Studies Dean' AS name, 'CCS_DEAN' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @ccs_id AS college_id, 'Computer Science' AS name, 'CS' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @ccs_id AS college_id, 'Entertainment and Multimedia Computing' AS name, 'EMC' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @ccs_id AS college_id, 'Information Systems' AS name, 'IS' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @ccs_id AS college_id, 'Information Technology' AS name, 'IT' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

-- Seed Departments for College of Engineering (COE)
INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coe_id AS college_id, 'College of Engineering Dean' AS name, 'COE_DEAN' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coe_id AS college_id, 'Chemical Engineering' AS name, 'CHE' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coe_id AS college_id, 'Civil Engineering' AS name, 'CIV' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coe_id AS college_id, 'Electrical Engineering' AS name, 'EE' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coe_id AS college_id, 'Electronics Engineering' AS name, 'ECE' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coe_id AS college_id, 'Industrial Engineering' AS name, 'IE' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @coe_id AS college_id, 'Mechanical Engineering' AS name, 'ME' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

-- Seed Departments for College of Nursing (CON)
INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @con_id AS college_id, 'College of Nursing Dean' AS name, 'CON_DEAN' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

-- Seed Departments for School of Business and Management (SBM)
INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @sbm_id AS college_id, 'School of Business and Management Dean' AS name, 'SBM_DEAN' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @sbm_id AS college_id, 'Graduate Studies' AS name, 'GS' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @sbm_id AS college_id, 'Accountancy' AS name, 'ACC' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @sbm_id AS college_id, 'Business and Administration' AS name, 'BUSADMIN' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

-- Seed Departments for School of Education (SOE)
INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @soe_id AS college_id, 'School of Education Dean' AS name, 'SOE_DEAN' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

-- Seed Departments for School of Law (SOL)
INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @sol_id AS college_id, 'School of Law Dean' AS name, 'SOL_DEAN' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

-- Seed Departments for School of Medicine (SOM)
INSERT INTO FC_department (college_id, name, abbreviation, is_active)
SELECT * FROM (
    SELECT @som_id AS college_id, 'School of Medicine Dean' AS name, 'SOM_DEAN' AS abbreviation, 1 AS is_active
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_department d WHERE d.college_id = v.college_id AND d.abbreviation = v.abbreviation
);

-- Get department IDs for commonly used departments
SET @cs_id = (SELECT id FROM FC_department WHERE abbreviation = 'CS' AND college_id = @ccs_id LIMIT 1);
SET @it_id = (SELECT id FROM FC_department WHERE abbreviation = 'IT' AND college_id = @ccs_id LIMIT 1);
SET @cas_dean_id = (SELECT id FROM FC_department WHERE abbreviation = 'CAS_DEAN' AND college_id = @cas_id LIMIT 1);
SET @ccs_dean_id = (SELECT id FROM FC_department WHERE abbreviation = 'CCS_DEAN' AND college_id = @ccs_id LIMIT 1);

-- Seed Offices
INSERT INTO FC_office (name, abbreviation, is_active, display_order)
SELECT * FROM (
    SELECT 'University Library' AS name, 'LIB' AS abbreviation, 1 AS is_active, 0 AS display_order
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_office o WHERE o.abbreviation = v.abbreviation
);

INSERT INTO FC_office (name, abbreviation, is_active, display_order)
SELECT * FROM (
    SELECT 'University Registrar' AS name, 'REG' AS abbreviation, 1 AS is_active, 1 AS display_order
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_office o WHERE o.abbreviation = v.abbreviation
);

INSERT INTO FC_office (name, abbreviation, is_active, display_order)
SELECT * FROM (
    SELECT 'Office of the Vice President for Higher Education' AS name, 'OVPHE' AS abbreviation, 1 AS is_active, 2 AS display_order
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_office o WHERE o.abbreviation = v.abbreviation
);

INSERT INTO FC_office (name, abbreviation, is_active, display_order)
SELECT * FROM (
    SELECT 'Human Resources Office' AS name, 'HRO' AS abbreviation, 1 AS is_active, 3 AS display_order
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_office o WHERE o.abbreviation = v.abbreviation
);

-- Enforce Office display_order alignment with current approver flow office-step order
UPDATE FC_office SET display_order = 0 WHERE abbreviation = 'LIB';
UPDATE FC_office SET display_order = 1 WHERE abbreviation = 'REG';
UPDATE FC_office SET display_order = 2 WHERE abbreviation = 'OVPHE';
UPDATE FC_office SET display_order = 3 WHERE abbreviation = 'HRO';

-- Get admin IDs (using User directly)
SET @ciso_user_id = (SELECT id FROM FC_user WHERE email = '20220025546@my.xu.edu.ph' LIMIT 1);
SET @ovphe_user_id = (SELECT id FROM FC_user WHERE email = '20190016375@my.xu.edu.ph' LIMIT 1);

-- Get user IDs
SET @approver_user_id = (SELECT id FROM FC_user WHERE email = 'approver.seed@xu.edu.ph' LIMIT 1);
SET @assistant_user_id = (SELECT id FROM FC_user WHERE email = 'assistant.seed@xu.edu.ph' LIMIT 1);
SET @faculty_user_id = (SELECT id FROM FC_user WHERE email = 'faculty.seed@xu.edu.ph' LIMIT 1);
SET @ciso_user_id = (SELECT id FROM FC_user WHERE email = '20220025546@my.xu.edu.ph' LIMIT 1);
SET @ovphe_user_id = (SELECT id FROM FC_user WHERE email = '20190016375@my.xu.edu.ph' LIMIT 1);


-- Seed Approver for main user (20220025546@my.xu.edu.ph) as Department Chair
INSERT INTO FC_approver (user_id, approver_type, college_id, department_id)
VALUES 
(@ciso_user_id, 'Department', @ccs_id, @it_id)
ON DUPLICATE KEY UPDATE
    approver_type = VALUES(approver_type),
    college_id = VALUES(college_id),
    department_id = VALUES(department_id);

-- Seed Approver for OVPHE user (20190016375@my.xu.edu.ph) as Office approver
INSERT INTO FC_approver (user_id, approver_type, office_id)
VALUES 
(@ovphe_user_id, 'Office', (SELECT id FROM FC_office WHERE abbreviation = 'OVPHE' LIMIT 1))
ON DUPLICATE KEY UPDATE
    approver_type = VALUES(approver_type),
    office_id = VALUES(office_id);

-- Seed UserRole for OVPHE user (20190016375@my.xu.edu.ph) as Approver with office context
INSERT INTO FC_userrole (user_id, role_id, office_id, assigned_by_id, assigned_date, is_active)
SELECT 
    u.id AS user_id, 
    r.id AS role_id,
    (SELECT id FROM FC_office WHERE abbreviation = 'OVPHE' LIMIT 1) AS office_id,
    @ovphe_user_id AS assigned_by_id,
    NOW() AS assigned_date,
    1 AS is_active
FROM FC_user u
CROSS JOIN FC_role r
WHERE u.email = '20190016375@my.xu.edu.ph' AND r.name = 'Approver'
ON DUPLICATE KEY UPDATE
    is_active = VALUES(is_active);

-- Seed StudentAssistant
INSERT INTO FC_studentassistant (user_id, college_id, department_id)
VALUES 
(@assistant_user_id, @ccs_id, @cs_id)
ON DUPLICATE KEY UPDATE
    college_id = VALUES(college_id),
    department_id = VALUES(department_id);

INSERT INTO FC_studentassistant (user_id, college_id, department_id)
VALUES 
(@ciso_user_id, @ccs_id, @it_id)
ON DUPLICATE KEY UPDATE
    college_id = VALUES(college_id),
    department_id = VALUES(department_id);

-- Seed Faculty (needed for real analytics)
INSERT INTO FC_faculty (user_id, employee_id, first_name, last_name, college_id, department_id)
SELECT * FROM (
    SELECT @faculty_user_id AS user_id, 'EMP-SEED-1' AS employee_id, 'Faye' AS first_name, 'Faculty' AS last_name, @ccs_id AS college_id, @cs_id AS department_id
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_faculty f WHERE f.user_id = v.user_id
);

SET @faculty_id = (SELECT id FROM FC_faculty WHERE user_id = @faculty_user_id LIMIT 1);

-- Seed Clearances for real analytics
INSERT INTO FC_clearance (faculty_id, academic_year, term, status, submitted_date, completed_date)
SELECT * FROM (
    SELECT @faculty_id AS faculty_id, YEAR(NOW()) AS academic_year, '1ST' AS term, 'COMPLETED' AS status, NOW() AS submitted_date, NOW() AS completed_date
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_clearance c WHERE c.faculty_id = v.faculty_id AND c.academic_year = v.academic_year AND c.term = v.term AND c.status = v.status
);

INSERT INTO FC_clearance (faculty_id, academic_year, term, status, submitted_date, completed_date)
SELECT * FROM (
    SELECT @faculty_id AS faculty_id, YEAR(NOW()) AS academic_year, '1ST' AS term, 'PENDING' AS status, NOW() AS submitted_date, NULL AS completed_date
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_clearance c WHERE c.faculty_id = v.faculty_id AND c.academic_year = v.academic_year AND c.term = v.term AND c.status = v.status
);

-- Seed ClearanceTimeline FIRST
INSERT INTO FC_clearancetimeline (name, academic_year_start, academic_year_end, term, clearance_start_date, clearance_end_date, created_by_id, is_active, created_at, updated_at)
SELECT * FROM (
    SELECT CONCAT('2501 Faculty Clearance') AS name, 2025 AS academic_year_start, 2026 AS academic_year_end, '1ST' AS term, CURDATE() AS clearance_start_date, CURDATE() AS clearance_end_date, @ovphe_user_id AS created_by_id, 1 AS is_active, NOW() AS created_at, NOW() AS updated_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_clearancetimeline ct WHERE ct.academic_year_start = v.academic_year_start AND ct.academic_year_end = v.academic_year_end AND ct.term = v.term
);

-- Get latest timeline ID for reference
SET @latest_timeline_id = (
    SELECT id FROM FC_clearancetimeline ORDER BY id DESC LIMIT 1
);

SET @latest_clearance_id = (
    SELECT id FROM FC_clearance WHERE faculty_id = @faculty_id ORDER BY id DESC LIMIT 1
);

SET @latest_timeline_id = (
    SELECT id FROM FC_clearancetimeline ORDER BY id DESC LIMIT 1
);

-- Seed ApproverFlowConfig
INSERT INTO FC_approverflowconfig (created_by_id, clearance_timeline_id, created_at, updated_at)
SELECT * FROM (
    SELECT @ovphe_user_id AS created_by_id, @latest_timeline_id AS clearance_timeline_id, NOW() AS created_at, NOW() AS updated_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_approverflowconfig
);

-- Get config ID (single-config assumption)
SET @config_id = (SELECT id FROM FC_approverflowconfig ORDER BY id ASC LIMIT 1);

-- Seed ApproverFlowSteps only if they don't exist
INSERT INTO FC_approverflowstep (config_id, `order`, category)
SELECT * FROM (
    SELECT @config_id AS config_id, 0 AS `order`, 'Department Chair' AS category
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_approverflowstep s WHERE s.config_id = v.config_id AND s.`order` = v.`order`
);

INSERT INTO FC_approverflowstep (config_id, `order`, category)
SELECT * FROM (
    SELECT @config_id AS config_id, 1 AS `order`, 'College Dean' AS category
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_approverflowstep s WHERE s.config_id = v.config_id AND s.`order` = v.`order`
);

-- Link office-based steps to actual Office rows
SET @reg_office_id = (SELECT id FROM FC_office WHERE abbreviation = 'REG' LIMIT 1);
SET @lib_office_id = (SELECT id FROM FC_office WHERE abbreviation = 'LIB' LIMIT 1);
SET @ovphe_office_id = (SELECT id FROM FC_office WHERE abbreviation = 'OVPHE' LIMIT 1);
SET @hro_office_id = (SELECT id FROM FC_office WHERE abbreviation = 'HRO' LIMIT 1);

INSERT INTO FC_approverflowstep (config_id, `order`, category, office_id)
SELECT * FROM (
    SELECT @config_id AS config_id, 2 AS `order`, 'University Registrar' AS category, @reg_office_id AS office_id
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_approverflowstep s WHERE s.config_id = v.config_id AND s.`order` = v.`order`
);

INSERT INTO FC_approverflowstep (config_id, `order`, category, office_id)
SELECT * FROM (
    SELECT @config_id AS config_id, 3 AS `order`, 'University Library' AS category, @lib_office_id AS office_id
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_approverflowstep s WHERE s.config_id = v.config_id AND s.`order` = v.`order`
);

INSERT INTO FC_approverflowstep (config_id, `order`, category, office_id)
SELECT * FROM (
    SELECT @config_id AS config_id, 4 AS `order`, 'Office of the Vice President for Higher Education' AS category, @ovphe_office_id AS office_id
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_approverflowstep s WHERE s.config_id = v.config_id AND s.`order` = v.`order`
);

INSERT INTO FC_approverflowstep (config_id, `order`, category, office_id)
SELECT * FROM (
    SELECT @config_id AS config_id, 5 AS `order`, 'Human Resources Office' AS category, @hro_office_id AS office_id
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_approverflowstep s WHERE s.config_id = v.config_id AND s.`order` = v.`order`
);

-- Get step IDs and link colleges
INSERT IGNORE INTO FC_approverflowstep_colleges (approverflowstep_id, college_id)
SELECT afs.id, c.id
FROM FC_approverflowstep afs
CROSS JOIN FC_college c
WHERE afs.config_id = @config_id 
AND c.abbreviation IN ('CCS', 'CAS');

-- Seed Announcements
INSERT INTO FC_announcement (title, body, created_by_id, pin_announcement, is_active, start_date, created_at)
SELECT * FROM (
    SELECT 'System Maintenance Notice' AS title, 'This is seeded announcement data.' AS body, @ovphe_user_id AS created_by_id, 1 AS pin_announcement, 1 AS is_active, NOW() AS start_date, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_announcement a WHERE a.title = v.title
);

INSERT INTO FC_announcement (title, body, created_by_id, pin_announcement, is_active, start_date, created_at)
SELECT * FROM (
    SELECT 'Welcome OVPHE' AS title, 'Welcome! This is seeded announcement data.' AS body, @ovphe_user_id AS created_by_id, 0 AS pin_announcement, 1 AS is_active, NOW() AS start_date, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_announcement a WHERE a.title = v.title
);

-- Seed SystemGuidelines
INSERT INTO FC_systemguideline (title, body, created_by_id, is_active, created_at)
SELECT * FROM (
    SELECT 'General Safety Guidelines' AS title, 'This is seeded guideline data.' AS body, @ovphe_user_id AS created_by_id, 1 AS is_active, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_systemguideline sg WHERE sg.title = v.title
);

INSERT INTO FC_systemguideline (title, body, created_by_id, is_active, created_at)
SELECT * FROM (
    SELECT 'Clearance Reminders' AS title, 'This is seeded guideline data.' AS body, @ovphe_user_id AS created_by_id, 1 AS is_active, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_systemguideline sg WHERE sg.title = v.title
);

-- Seed Notifications for OVPHE user
SET @seed_school_year_label = CONCAT('S.Y. ', YEAR(NOW()), '-', YEAR(NOW()) + 1);
SET @seed_term_label = 'First Semester';
SET @seed_dept_office_name = 'University Registrar';
SET @seed_days_left = '7 days';
SET @seed_announcement_title = 'System Maintenance Notice';

-- Seed Notifications for OVPHE user
INSERT INTO FC_notification (user_id, user_role, title, status, body, details, is_read, created_at)
SELECT * FROM (
    SELECT @ovphe_user_id AS user_id, 'OVPHE' AS user_role, 'Clearance Timeline Started' AS title, 'submitted' AS status, CONCAT('The clearance timeline for ', @seed_school_year_label, ' ', @seed_term_label, ' is now active. Faculty Members may begin submitting requests.') AS body, '[]' AS details, 0 AS is_read, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_notification n WHERE n.user_id = v.user_id AND n.title = v.title AND n.status = v.status
);

INSERT INTO FC_notification (user_id, user_role, title, status, body, details, is_read, created_at)
SELECT * FROM (
    SELECT @ovphe_user_id AS user_id, 'OVPHE' AS user_role, 'Workflow Update' AS title, 'submitted' AS status, CONCAT(@seed_dept_office_name, ' has been added to the approval flow. You may now receive clearance requests.') AS body, '[]' AS details, 0 AS is_read, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_notification n WHERE n.user_id = v.user_id AND n.title = v.title AND n.status = v.status
);

-- Seed Notifications for CISO user
INSERT INTO FC_notification (user_id, user_role, title, status, body, details, is_read, created_at)
SELECT * FROM (
    SELECT @ciso_user_id AS user_id, 'CISO' AS user_role, 'New Announcement' AS title, 'submitted' AS status, CONCAT(@seed_announcement_title, ', Check announcements section for more details.') AS body, '[]' AS details, 0 AS is_read, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_notification n WHERE n.user_id = v.user_id AND n.title = v.title AND n.status = v.status
);

INSERT INTO FC_notification (user_id, user_role, title, status, body, details, is_read, created_at)
SELECT * FROM (
    SELECT @ciso_user_id AS user_id, 'CISO' AS user_role, 'Faculty Data Dump Uploaded' AS title, 'submitted' AS status, CONCAT('A new faculty data dump has been successfully downloaded for ', @seed_school_year_label, ' ', @seed_term_label, '.') AS body, '[]' AS details, 0 AS is_read, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_notification n WHERE n.user_id = v.user_id AND n.title = v.title AND n.status = v.status
);

-- Seed Notifications for Faculty user
INSERT INTO FC_notification (user_id, user_role, title, status, body, details, is_read, created_at)
SELECT * FROM (
    SELECT @faculty_user_id AS user_id, 'Faculty' AS user_role, 'Deadline Approaching' AS title, 'submitted' AS status, CONCAT('The clearance period is coming to end in ', @seed_days_left, '. Ensure to submit your requirements on time to maintain timely submissions.') AS body, '["Submission of Requirement 1", "Submission of Requirement 2"]' AS details, 0 AS is_read, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_notification n WHERE n.user_id = v.user_id AND n.title = v.title AND n.status = v.status
);

-- Seed Notifications for Faculty user
INSERT INTO FC_notification (user_id, user_role, title, status, body, details, is_read, created_at)
SELECT * FROM (
    SELECT @faculty_user_id AS user_id, 'Faculty' AS user_role, 'Deadline Approaching' AS title, 'submitted' AS status, CONCAT('The clearance period is coming to end in ', @seed_days_left, '. Ensure to submit your requirements on time to maintain timely submissions.') AS body, '["Submission of Requirement 1", "Submission of Requirement 2"]' AS details, 0 AS is_read, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_notification n WHERE n.user_id = v.user_id AND n.title = v.title AND n.status = v.status
);

-- Seed Notifications for Faculty user
INSERT INTO FC_notification (user_id, user_role, title, status, body, details, is_read, created_at)
SELECT * FROM (
    SELECT @faculty_user_id AS user_id, 'Faculty' AS user_role, 'Deadline Approaching' AS title, 'submitted' AS status, CONCAT('The clearance period is coming to end in ', @seed_days_left, '. Ensure to submit your requirements on time to maintain timely submissions.') AS body, '["Submission of Requirement 1", "Submission of Requirement 2"]' AS details, 0 AS is_read, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_notification n WHERE n.user_id = v.user_id AND n.title = v.title AND n.status = v.status
);

-- Seed ActivityLogs
INSERT INTO FC_activitylog (event_type, user_id, approver_department, university_id, request_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'approved_clearance' AS event_type, @ovphe_user_id AS user_id, 'College of Computer Studies' AS approver_department, '2005123456789' AS university_id, '2005123456789' AS request_id, 0 AS is_superadmin, 0 AS is_staff, '["Seeded log"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al
    WHERE al.event_type = v.event_type
      AND al.user_id = v.user_id
      AND al.university_id = v.university_id
      AND al.request_id = v.request_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'created_guideline' AS event_type, @ciso_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Guideline Title: General Safety Guidelines"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'edited_guideline' AS event_type, @ciso_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Guideline Title: General Safety Guidelines"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'set_guideline_status_active' AS event_type, @ciso_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Guideline Title: General Safety Guidelines"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'set_guideline_status_inactive' AS event_type, @ciso_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Guideline Title: Clearance Reminders"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'archived_guideline' AS event_type, @ciso_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Guideline Title: Clearance Reminders"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'created_announcement' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Announcement Title: System Maintenance Notice"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'set_announcement_status_active' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Announcement Title: System Maintenance Notice"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'set_announcement_status_inactive' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Announcement Title: Welcome OVPHE"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'created_timeline' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["School Year: S.Y. 2025-2026", "Semester: First Semester"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'edited_timeline' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["School Year: S.Y. 2025-2026", "Semester: First Semester"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'set_timeline_status_active' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["School Year: S.Y. 2025-2026", "Semester: First Semester"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'set_timeline_status_inactive' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["School Year: S.Y. 2024-2025", "Semester: Second Semester"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'created_college' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["College: College of Computer Studies"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'edited_college' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["College: College of Computer Studies"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'deleted_college' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["College: College of Arts and Sciences"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'created_department' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Department: Computer Science", "College: College of Computer Studies"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'edited_department' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Department: Computer Science", "College: College of Computer Studies"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'deleted_department' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Department: Information Technology", "College: College of Computer Studies"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'created_office' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Office: University Registrar"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'edited_office' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Office: University Registrar"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'deleted_office' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Office: University Library"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'added_to_approver_flow' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Department/Office: University Registrar"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'edited_approver_flow' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Department/Office: University Registrar"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'removed_from_approver_flow' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Department/Office: University Registrar"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'exported_clearance_results' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["School Year: S.Y. 2025-2026", "Semester: First Semester"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'user_login' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Role: OVPHE", "Department/Office: OVPHE"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'user_logout' AS event_type, @ovphe_user_id AS user_id, 0 AS is_superadmin, 0 AS is_staff, '["Role: OVPHE", "Department/Office: OVPHE"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al WHERE al.event_type = v.event_type AND al.user_id = v.user_id
);

INSERT INTO FC_activitylog (event_type, user_id, approver_department, university_id, request_id, is_superadmin, is_staff, details, created_at)
SELECT * FROM (
    SELECT 'approved_clearance' AS event_type, @ciso_user_id AS user_id, 'College of Computer Studies' AS approver_department, '2005123456789' AS university_id, '2005123456789' AS request_id, 0 AS is_superadmin, 0 AS is_staff, '["Seeded log"]' AS details, NOW() AS created_at
) AS v
WHERE NOT EXISTS (
    SELECT 1 FROM FC_activitylog al
    WHERE al.event_type = v.event_type
      AND al.user_id = v.user_id
      AND al.university_id = v.university_id
      AND al.request_id = v.request_id
);

EOF

echo "Database initialized. Starting Gunicorn..."

exec gunicorn --bind 0.0.0.0:8001 --workers 3 --timeout 120 --access-logfile - --error-logfile - --log-level debug --worker-class gevent XUFC.wsgi:application