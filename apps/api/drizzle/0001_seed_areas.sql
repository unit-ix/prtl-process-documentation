-- Stammdaten als Migration, nicht als Seed: unter platform: azure gibt es keine Seeds
-- (.claude/docs/patterns-azure.md). Quelle: docs/VA PE 1 IMS 002a01 Anlage
-- Prozessabkürzungen-Vorschlag Lysandra Wagner_2026.docx, zweite Tabelle — die Struktur 2026 mit
-- 18 Bereichen. Die erste Tabelle des Dokuments ist der Ist-Stand und enthält Doppelungen
-- (EDV/IT und Information Technology, QC und QA, PROD und F/T); sie wird bewusst nicht übernommen.
--
-- Feste UUIDs statt gen_random_uuid(), damit ON CONFLICT (id) DO NOTHING greift und die Migration
-- wiederholbar bleibt. Kurzbezeichnung und Prozessart speisen das Identkennzeichen (§5.2) und
-- dürfen sich später nicht rückwirkend ändern.
INSERT INTO "areas" ("id", "title", "short_code", "category_number") VALUES
	('c0000000-0000-4000-8000-000000000001', 'Geschäftsführung', 'CEO', 1),
	('c0000000-0000-4000-8000-000000000002', 'Human Resources', 'HR', 1),
	('c0000000-0000-4000-8000-000000000003', 'Finance', 'CFO', 1),
	('c0000000-0000-4000-8000-000000000004', 'Integrated Management System', 'IMS', 1),
	('c0000000-0000-4000-8000-000000000005', 'Business Development', 'BDM', 2),
	('c0000000-0000-4000-8000-000000000006', 'Purchasing', 'PUR', 2),
	('c0000000-0000-4000-8000-000000000007', 'Customer Management', 'CM', 2),
	('c0000000-0000-4000-8000-000000000008', 'Accountmanagement', 'AM', 2),
	('c0000000-0000-4000-8000-000000000009', 'Ordermanagement', 'OM', 2),
	('c0000000-0000-4000-8000-000000000010', 'Projectmanagement', 'PM', 2),
	('c0000000-0000-4000-8000-000000000011', 'Repair & Service', 'RSC', 2),
	('c0000000-0000-4000-8000-000000000012', 'Product Innovation', 'PI', 2),
	('c0000000-0000-4000-8000-000000000013', 'Operation + Technology', 'F/T', 2),
	('c0000000-0000-4000-8000-000000000014', 'Information Technology', 'IT', 3),
	('c0000000-0000-4000-8000-000000000015', 'Process and Organization Development', 'POD', 3),
	('c0000000-0000-4000-8000-000000000016', 'Quality Assurance Management', 'QAM', 3),
	('c0000000-0000-4000-8000-000000000017', 'Total Productive Maintenance', 'TPM', 3),
	('c0000000-0000-4000-8000-000000000018', 'Facility Management', 'FM', 3)
ON CONFLICT ("id") DO NOTHING;
