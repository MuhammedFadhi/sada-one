-- ============================================================
-- SA'DA ONE — 037  Staff import  (SA_DA_STAFF_LIST.xlsx)
--
-- Creates a MINIMAL record per person. They fill in the rest
-- themselves via the onboarding wizard on first sign-in.
--
-- Everyone gets a record, including staff with no email on the
-- sheet — those get a generated sign-in address so they can still
-- receive temporary credentials. They can change it to their real
-- address inside the wizard.
--
-- Duplicates are skipped: guarded on work email AND the last 9
-- digits of the mobile, because numbers are stored inconsistently
-- ('+966502431529' / '966502431529' / '0546194434'). That is what
-- catches Nahan, whose sheet email differs from the one on file.
--
-- SAFE TO RE-RUN.
-- ============================================================

-- ── 0 · Repair schema drift (columns the wizard writes) ─────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS iqama_number      TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS passport_number   TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- ── 1 · Business units ──────────────────────────────────────
INSERT INTO divisions (id, company_id, name_en, name_ar)
SELECT 'd0000002-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Artland Industrial Marketing', 'Artland Industrial Marketing'
WHERE NOT EXISTS (SELECT 1 FROM divisions WHERE id='d0000002-0000-0000-0000-000000000001' OR upper(trim(name_en))=upper('ARTLAND INDUSTRIAL MARKETING'));
INSERT INTO divisions (id, company_id, name_en, name_ar)
SELECT 'd0000002-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Artland 360', 'Artland 360'
WHERE NOT EXISTS (SELECT 1 FROM divisions WHERE id='d0000002-0000-0000-0000-000000000002' OR upper(trim(name_en))=upper('ARTLAND 360'));
INSERT INTO divisions (id, company_id, name_en, name_ar)
SELECT 'd0000002-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Artland Infotech', 'Artland Infotech'
WHERE NOT EXISTS (SELECT 1 FROM divisions WHERE id='d0000002-0000-0000-0000-000000000003' OR upper(trim(name_en))=upper('ARTLAND INFOTECH'));
INSERT INTO divisions (id, company_id, name_en, name_ar)
SELECT 'd0000002-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Sada Al Arab Trading', 'Sada Al Arab Trading'
WHERE NOT EXISTS (SELECT 1 FROM divisions WHERE id='d0000002-0000-0000-0000-000000000004' OR upper(trim(name_en))=upper('SADA AL ARAB TRADING'));
INSERT INTO divisions (id, company_id, name_en, name_ar)
SELECT 'd0000002-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Sada Shop Dammam', 'Sada Shop Dammam'
WHERE NOT EXISTS (SELECT 1 FROM divisions WHERE id='d0000002-0000-0000-0000-000000000005' OR upper(trim(name_en))=upper('SADA SHOP DAMMAM'));
INSERT INTO divisions (id, company_id, name_en, name_ar)
SELECT 'd0000002-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Sada Shop Khobar', 'Sada Shop Khobar'
WHERE NOT EXISTS (SELECT 1 FROM divisions WHERE id='d0000002-0000-0000-0000-000000000006' OR upper(trim(name_en))=upper('SADA SHOP KHOBAR'));
INSERT INTO divisions (id, company_id, name_en, name_ar)
SELECT 'd0000002-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Sada Shop Jubail', 'Sada Shop Jubail'
WHERE NOT EXISTS (SELECT 1 FROM divisions WHERE id='d0000002-0000-0000-0000-000000000007' OR upper(trim(name_en))=upper('SADA SHOP JUBAIL'));
INSERT INTO divisions (id, company_id, name_en, name_ar)
SELECT 'd0000002-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Artland Pest Control', 'Artland Pest Control'
WHERE NOT EXISTS (SELECT 1 FROM divisions WHERE id='d0000002-0000-0000-0000-000000000008' OR upper(trim(name_en))=upper('ARTLAND PEST CONTROL'));
-- 'SADA SCIENTIFIC' already exists (35ed17e1-abd9-4c8e-86dc-a8de0254ed32) — reused.
INSERT INTO divisions (id, company_id, name_en, name_ar)
SELECT 'd0000002-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Saudi Staffs', 'Saudi Staffs'
WHERE NOT EXISTS (SELECT 1 FROM divisions WHERE id='d0000002-0000-0000-0000-000000000009' OR upper(trim(name_en))=upper('SAUDI STAFFS'));

-- ── 2 · Staff ───────────────────────────────────────────────

-- ARTLAND INDUSTRIAL MARKETING  (6)
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0001', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000001', 'Muhammed Salim Karuvath', 'Muhammed Salim Karuvath',
       'Stock Clerk', 'Stock Clerk', 'muhammedsalim5474@gmail.com', '966569220570', '2506822952',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('muhammedsalim5474@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='569220570');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0002', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000001', 'Shylaz Gafoor Hassan', 'Shylaz Gafoor Hassan',
       'Project Manager', 'Project Manager', 'shylazhassan@ardhalfan.com', '966540546771', '2014154237',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('shylazhassan@ardhalfan.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='540546771');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0003', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000001', 'Wahid Ul Haq', 'Wahid Ul Haq',
       'Stock Clerk', 'Stock Clerk', 'wahidulhaq2@gmail.com', '966507039579', '2555068499',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('wahidulhaq2@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='507039579');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0004', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000001', 'Isaq Ali', 'Isaq Ali',
       'Stock Clerk', 'Stock Clerk', 'isaq@ardhalfan.com', '966536865441', '2545403830',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('isaq@ardhalfan.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='536865441');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0005', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000001', 'Hafsal Hussain Moochikkadavan Paikkattu', 'Hafsal Hussain Moochikkadavan Paikkattu',
       'Admin Clerk', 'Admin Clerk', 'hafsalhussain2121@gmail.com', '966535390612', '2540902083',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('hafsalhussain2121@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='535390612');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0006', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000001', 'Muhammed Iqbal Valiyathodi Parambu', 'Muhammed Iqbal Valiyathodi Parambu',
       'Stock Clerk', 'Stock Clerk', 'iqbal@sadawater.com', '966591527420', '2574999633',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('iqbal@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='591527420');

-- ARTLAND 360  (2)
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0007', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000002', 'Muhammed Fadhil', 'Muhammed Fadhil',
       'Project Supervisor', 'Project Supervisor', 'fadhil@a3sixty.com', '966530727630', '2630968705',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('fadhil@a3sixty.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='530727630');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0008', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000002', 'Muhammed Ali Hussain', 'Muhammed Ali Hussain',
       'Director', 'Director', 'ali@a3sixty.com', '966537086063', '2611950763',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('ali@a3sixty.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='537086063');

-- ARTLAND INFOTECH  (10)
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0009', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000003', 'Adnan', 'Adnan',
       'Technican', 'Technican', 'shahadmubarak71@gmail.com', '966593793301', '2309867436',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('shahadmubarak71@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='593793301');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0010', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000003', 'Muhammed Aqil Qasi', 'Muhammed Aqil Qasi',
       'Director', 'Director', 'aqil@artlandinfotech.com', '966597557288', '2376751299',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('aqil@artlandinfotech.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='597557288');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0011', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000003', 'Arshad Usmani', 'Arshad Usmani',
       'Marketing Executive', 'Marketing Executive', 'a.usmani@artlandinfotech.com', '966597001708', '2517603490',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('a.usmani@artlandinfotech.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='597001708');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0012', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000003', 'Musawar Hussain Ali', 'Musawar Hussain Ali',
       'Technican', 'Technican', 'musawarh841@gmail.com', '966596783271', '2418644296',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('musawarh841@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='596783271');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0013', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000003', 'Chaleh Ahmed Roni', 'Chaleh Ahmed Roni',
       'Technican', 'Technican', 'ahammadroni728@gmail.com', '966569405685', '2495468189',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('ahammadroni728@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='569405685');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0014', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000003', 'Jamsheed Puthiyottum Kandiyil', 'Jamsheed Puthiyottum Kandiyil',
       'Accounts Officer', 'Accounts Officer', 'jamsheedpk@sadawater.com', '966549609713', '2373267497',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('jamsheedpk@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='549609713');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0015', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000003', 'Muhfazur Rahman', 'Muhfazur Rahman',
       'Technican', 'Technican', 'fahimmahfuz007@gmail.com', '966538190979', '2528510643',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('fahimmahfuz007@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='538190979');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0016', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000003', 'Zeeshan', 'Zeeshan',
       'Helper', 'Helper', 'zeeshan.sg0016@sadawater.com', '966595429053', '2577193168',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('zeeshan.sg0016@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='595429053');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0017', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000003', 'Shohaib', 'Shohaib',
       'Shop Incharge', 'Shop Incharge', 'shuaibmansuri@gmail.com', '966534686391', '2622140297',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('shuaibmansuri@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='534686391');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0018', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000003', 'Asif Sayed', 'Asif Sayed',
       'Staff', 'Staff', 'asifsarasimra@gmail.com', '966591537147', NULL,
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('asifsarasimra@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='591537147');

-- SADA AL ARAB TRADING  (25)
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0019', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Mohammad Mohammad Khan', 'Mohammad Mohammad Khan',
       'Technician', 'Technician', 'arshadkhan@sadawater.com', '966591540964', '2412813921',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('arshadkhan@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='591540964');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0020', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Abdul Nazar Chokli', 'Abdul Nazar Chokli',
       'Delivery Supervisor', 'Delivery Supervisor', 'nazar@sadawater.com', '966544306810', '2418982829',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('nazar@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='544306810');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0021', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Md Morshed Alam', 'Md Morshed Alam',
       'Technician', 'Technician', 'morsedalom369@gmail.com', '966558591152', '2529801256',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('morsedalom369@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='558591152');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0022', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Waseem Muhammed Ali Kallidukkil', 'Waseem Muhammed Ali Kallidukkil',
       'Sales Manager', 'Sales Manager', 'waseem@sadawater.com', '966592706689', '2547411500',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('waseem@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='592706689');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0023', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Sarfras Akthar Pattuvathil', 'Sarfras Akthar Pattuvathil',
       'Procurement Manager', 'Procurement Manager', 'sarfras@sadawater.com', '966568057786', '2414160164',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('sarfras@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='568057786');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0024', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Khan Mazhar', 'Khan Mazhar',
       'Business Devlopment Executive', 'Business Devlopment Executive', 'mazhar.khan@sadawater.com', '966546194434', '2519159806',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('mazhar.khan@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='546194434');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0025', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Abdul Majeed Majeed', 'Abdul Majeed Majeed',
       'Technician', 'Technician', 'mohdmajeed1064@gmail.com', '966503148852', '2501248963',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('mohdmajeed1064@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='503148852');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0026', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Mizanur Rahman', 'Mizanur Rahman',
       'Technician', 'Technician', 'mizanbangla68@gmail.com', '966571298563', '2521510897',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('mizanbangla68@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='571298563');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0027', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Abuthahir Pookkayil', 'Abuthahir Pookkayil',
       'Technician', 'Technician', 'abuthahirpookayil98@gmail.com', '966564169359', '2566873176',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('abuthahirpookayil98@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='564169359');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0028', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Alamin Hossain', 'Alamin Hossain',
       'Technician', 'Technician', 'mdalaminahammed7465@gmail.com', '966545956071', '2545463040',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('mdalaminahammed7465@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='545956071');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0029', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Muhammed Rajish', 'Muhammed Rajish',
       'Technician', 'Technician', 'rajishppy786@gmail.com', '966539423857', '2591603838',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('rajishppy786@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='539423857');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0030', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Sohel Kashem', 'Sohel Kashem',
       'Office Boy', 'Office Boy', 'sohelkashemm@gmail.com', '966597430551', '2585340421',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('sohelkashemm@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='597430551');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0031', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Mohammad Mosarof Hossen', 'Mohammad Mosarof Hossen',
       'Technician', 'Technician', 'mosarof2114@gmail.com', '966546380307', '2495403210',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('mosarof2114@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='546380307');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0032', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Mohammad Tanjil Miah', 'Mohammad Tanjil Miah',
       'Technician', 'Technician', 'tanjilmia1992@gmail.com', '966534302325', '2561579562',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('tanjilmia1992@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='534302325');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0033', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Nabir Hossen', 'Nabir Hossen',
       'Technician', 'Technician', 'hnabir003@gmail.com', '966571514282', '2594405264',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('hnabir003@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='571514282');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0034', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Afser Vadake Thalakkal', 'Afser Vadake Thalakkal',
       'Technician', 'Technician', 'vafsar221@gmail.com', '966575048499', '2611950904',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('vafsar221@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='575048499');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0035', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Arsalanjaved Mughal Javed Ahmed', 'Arsalanjaved Mughal Javed Ahmed',
       'Technician', 'Technician', 'sharimughal5702216@gmail.com', '966530754130', '2570585048',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('sharimughal5702216@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='530754130');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0036', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Vidu Kiran', 'Vidu Kiran',
       'Business Devlopment Executive', 'Business Devlopment Executive', 'kiran@sadawater.com', '966549013155', '2629104833',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('kiran@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='549013155');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0037', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Roman Null Mia', 'Roman Null Mia',
       'Technician', 'Technician', 'mdr875997@gmail.com', '966557460165', '2587452810',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('mdr875997@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='557460165');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0038', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Anwer Mullapally', 'Anwer Mullapally',
       'Accounts Manager', 'Accounts Manager', 'anwermp@sadawater.com', '966553450811', '2351307554',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('anwermp@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='553450811');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0039', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Arshad Ahamed Koya', 'Arshad Ahamed Koya',
       'Technician', 'Technician', 'arshadairiketr.4321@gmail.com', '966548059525', '2417025794',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('arshadairiketr.4321@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='548059525');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0040', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Famsheed Fazal', 'Famsheed Fazal',
       'Helper', 'Helper', 'famshidfazal@gmail.com', '966541865033', '2626207126',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('famshidfazal@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='541865033');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0041', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Faisal Mahmood Younas', 'Faisal Mahmood Younas',
       'Welder', 'Welder', 'junefaisal553@gmail.com', '966570921905', '2570585048',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('junefaisal553@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='570921905');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0042', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Bahadur Mahat', 'Bahadur Mahat',
       'Helper', 'Helper', 'mahathemanta6@gmail.com', '966572592051', '2616327447',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('mahathemanta6@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='572592051');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0043', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000004', 'Nahan', 'Nahan',
       'Project Cordintor', 'Project Cordintor', 'nahannajeeb657@gmail.com', '966502431529', '2600246975',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('nahannajeeb657@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='502431529');

-- SADA SHOP DAMMAM  (2)
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0044', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000005', 'Mohammed Zayan Kasim', 'Mohammed Zayan Kasim',
       'Marketing Executive', 'Marketing Executive', 'zayan@sadawater.com', '966544073319', '2570277034',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('zayan@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='544073319');
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0045', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000005', 'Muhammad Farhan', 'Muhammad Farhan',
       'Marketing Executive', 'Marketing Executive', 'farhan2297@gmail.com', '966561181935', '2226534952',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('farhan2297@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='561181935');

-- SADA SHOP KHOBAR  (1)
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0046', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000006', 'Abdul Basith Namath Kandy', 'Abdul Basith Namath Kandy',
       'Marketing Executive', 'Marketing Executive', 'basith@sadawater.com', '966510991083', '2595428232',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('basith@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='510991083');

-- SADA SHOP JUBAIL  (1)
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0047', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000007', 'Mohamed Gadafi Ambalathil', 'Mohamed Gadafi Ambalathil',
       'Marketing Executive', 'Marketing Executive', 'gadafi@sadawater.com', '966566309562', '2593939578',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('gadafi@sadawater.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='566309562');

-- ARTLAND PEST CONTROL  (1)
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0048', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000008', 'Asim Naveed', 'Asim Naveed',
       'Technican', 'Technican', 'asimnaveed908@gmail.com', '966598262394', '2550532754',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('asimnaveed908@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='598262394');

-- SADA SCIENTIFIC  (1)
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0049', 'a0000000-0000-0000-0000-000000000001', '35ed17e1-abd9-4c8e-86dc-a8de0254ed32', 'Syed Khalid', 'Syed Khalid',
       'Sales Manager', 'Sales Manager', 'syed.khalid@sadascientific.com', '966560790428', '2126786702',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('syed.khalid@sadascientific.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='560790428');

-- SAUDI STAFFS  (1)
INSERT INTO employees (employee_number, company_id, division_id, full_name_en, full_name_ar,
       job_title_en, job_title_ar, work_email, mobile, iqama_number, join_date, contract_type, status)
SELECT 'SG-0050', 'a0000000-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000009', 'Muhammed Jafar Ali Al Hajji', 'Muhammed Jafar Ali Al Hajji',
       'Messenger', 'Messenger', 'modgte@gmail.com', '966563780904', '1076447810',
       CURRENT_DATE, 'permanent', 'active'
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE lower(e.work_email)=lower('modgte@gmail.com')
     OR right(regexp_replace(coalesce(e.mobile,''),'\D','','g'),9)='563780904');

-- ── 3 · Result ──────────────────────────────────────────────
SELECT '037 applied ✓'                       AS status,
       (SELECT count(*) FROM employees)      AS employees_total,
       (SELECT count(*) FROM divisions)      AS divisions_total,
       (SELECT count(*) FROM employees e
          LEFT JOIN user_profiles p ON p.employee_id=e.id
          WHERE p.id IS NULL)                AS still_need_accounts;