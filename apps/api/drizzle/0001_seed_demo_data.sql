-- Stammdaten statt Seed-Skript: eine Migration, damit die Demo-Daten denselben Weg gehen wie das
-- Schema (patterns-azure.md — "Braucht ein Projekt Stammdaten, sind das Migrationen, keine Seeds").
--
-- Feste UUID-Literale statt gen_random_uuid(): nur so ist ON CONFLICT (id) DO NOTHING moeglich und
-- die Migration idempotent. Auf companies.name gibt es keinen Unique-Index, der als Konfliktziel
-- taugen wuerde. `full_name` fehlt bewusst in der Contact-Spaltenliste — die Spalte ist
-- GENERATED ALWAYS und ein Insert darauf wuerde fehlschlagen.
INSERT INTO "companies" ("id", "name", "industry", "status", "employee_count", "city", "website", "created_on") VALUES
	('a0000000-0000-4000-8000-000000000001', 'Nordwind Logistik GmbH', 'services', 'active', 240, 'Hamburg', 'https://nordwind-logistik.example', '2026-01-08 09:00:00+00'),
	('a0000000-0000-4000-8000-000000000002', 'Brandenburger Maschinenbau AG', 'manufacturing', 'active', 1850, 'Potsdam', 'https://brandenburger-mb.example', '2026-01-22 09:00:00+00'),
	('a0000000-0000-4000-8000-000000000003', 'Rheinische Softwarewerke GmbH', 'technology', 'prospect', 95, 'Köln', 'https://rheinische-softwarewerke.example', '2026-02-11 09:00:00+00'),
	('a0000000-0000-4000-8000-000000000004', 'Alpenland Handel KG', 'retail', 'inactive', 60, 'München', 'https://alpenland-handel.example', '2026-03-03 09:00:00+00'),
	('a0000000-0000-4000-8000-000000000005', 'Stadtwerke Lindau AöR', 'public_sector', 'active', 430, 'Lindau', 'https://stadtwerke-lindau.example', '2026-04-17 09:00:00+00'),
	('a0000000-0000-4000-8000-000000000006', 'Ökotex Manufaktur GmbH', 'other', 'prospect', 18, 'Dresden', 'https://oekotex-manufaktur.example', '2026-05-29 09:00:00+00')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "contacts" ("id", "first_name", "last_name", "email", "phone", "role", "company_id", "is_primary", "created_on") VALUES
	('b0000000-0000-4000-8000-000000000001', 'Annika', 'Vogelsang', 'annika.vogelsang@nordwind-logistik.example', '+49 40 123456-10', 'decision_maker', 'a0000000-0000-4000-8000-000000000001', true, '2026-01-09 10:15:00+00'),
	('b0000000-0000-4000-8000-000000000002', 'Bendix', 'Thorwald', 'bendix.thorwald@nordwind-logistik.example', '+49 40 123456-11', 'influencer', 'a0000000-0000-4000-8000-000000000001', false, '2026-01-09 10:20:00+00'),
	('b0000000-0000-4000-8000-000000000003', 'Carlotta', 'Ehrenberg', 'carlotta.ehrenberg@nordwind-logistik.example', '+49 40 123456-12', 'user', 'a0000000-0000-4000-8000-000000000001', false, '2026-01-12 08:45:00+00'),
	('b0000000-0000-4000-8000-000000000004', 'Detlev', 'Ohlsen', 'detlev.ohlsen@nordwind-logistik.example', '', 'user', 'a0000000-0000-4000-8000-000000000001', false, '2026-01-14 14:05:00+00'),
	('b0000000-0000-4000-8000-000000000005', 'Elif', 'Yildirim', 'elif.yildirim@nordwind-logistik.example', '+49 40 123456-14', 'other', 'a0000000-0000-4000-8000-000000000001', false, '2026-01-19 11:30:00+00'),
	('b0000000-0000-4000-8000-000000000006', 'Fenna', 'Brakelmann', 'fenna.brakelmann@nordwind-logistik.example', '+49 40 123456-15', 'influencer', 'a0000000-0000-4000-8000-000000000001', false, '2026-02-02 16:40:00+00'),
	('b0000000-0000-4000-8000-000000000007', 'Gereon', 'Waldschmidt', 'gereon.waldschmidt@brandenburger-mb.example', '+49 331 987654-20', 'decision_maker', 'a0000000-0000-4000-8000-000000000002', true, '2026-01-23 09:10:00+00'),
	('b0000000-0000-4000-8000-000000000008', 'Henrike', 'Palmberg', 'henrike.palmberg@brandenburger-mb.example', '+49 331 987654-21', 'decision_maker', 'a0000000-0000-4000-8000-000000000002', false, '2026-01-23 09:25:00+00'),
	('b0000000-0000-4000-8000-000000000009', 'Ingo', 'Reuscher', 'ingo.reuscher@brandenburger-mb.example', '+49 331 987654-22', 'influencer', 'a0000000-0000-4000-8000-000000000002', false, '2026-01-27 13:00:00+00'),
	('b0000000-0000-4000-8000-000000000010', 'Jaqueline', 'Stührmann', 'jaqueline.stuehrmann@brandenburger-mb.example', '', 'user', 'a0000000-0000-4000-8000-000000000002', false, '2026-02-05 10:50:00+00'),
	('b0000000-0000-4000-8000-000000000011', 'Konrad', 'Ißleib', 'konrad.issleib@brandenburger-mb.example', '+49 331 987654-24', 'user', 'a0000000-0000-4000-8000-000000000002', false, '2026-02-18 15:15:00+00'),
	('b0000000-0000-4000-8000-000000000012', 'Liane', 'Dobberkau', 'liane.dobberkau@brandenburger-mb.example', '+49 331 987654-25', 'other', 'a0000000-0000-4000-8000-000000000002', false, '2026-03-01 08:20:00+00'),
	('b0000000-0000-4000-8000-000000000013', 'Marius', 'Öztürk', 'marius.oeztuerk@rheinische-softwarewerke.example', '+49 221 555012-30', 'decision_maker', 'a0000000-0000-4000-8000-000000000003', true, '2026-02-12 09:35:00+00'),
	('b0000000-0000-4000-8000-000000000014', 'Nele', 'Kupferschmid', 'nele.kupferschmid@rheinische-softwarewerke.example', '+49 221 555012-31', 'influencer', 'a0000000-0000-4000-8000-000000000003', false, '2026-02-12 09:55:00+00'),
	('b0000000-0000-4000-8000-000000000015', 'Ortwin', 'Balzereit', 'ortwin.balzereit@rheinische-softwarewerke.example', '', 'user', 'a0000000-0000-4000-8000-000000000003', false, '2026-02-20 12:10:00+00'),
	('b0000000-0000-4000-8000-000000000016', 'Pia', 'Grünewald', 'pia.gruenewald@rheinische-softwarewerke.example', '+49 221 555012-33', 'user', 'a0000000-0000-4000-8000-000000000003', false, '2026-03-06 17:00:00+00'),
	('b0000000-0000-4000-8000-000000000017', 'Quirin', 'Hasselbach', 'quirin.hasselbach@rheinische-softwarewerke.example', '+49 221 555012-34', 'other', 'a0000000-0000-4000-8000-000000000003', false, '2026-03-24 11:45:00+00'),
	('b0000000-0000-4000-8000-000000000018', 'Rosalie', 'Zangenberg', 'rosalie.zangenberg@alpenland-handel.example', '+49 89 4400213-40', 'decision_maker', 'a0000000-0000-4000-8000-000000000004', true, '2026-03-04 10:00:00+00'),
	('b0000000-0000-4000-8000-000000000019', 'Sören', 'Achterberg', 'soeren.achterberg@alpenland-handel.example', '+49 89 4400213-41', 'influencer', 'a0000000-0000-4000-8000-000000000004', false, '2026-03-04 10:30:00+00'),
	('b0000000-0000-4000-8000-000000000020', 'Theresa', 'Lindenmaier', 'theresa.lindenmaier@alpenland-handel.example', '', 'user', 'a0000000-0000-4000-8000-000000000004', false, '2026-03-13 09:15:00+00'),
	('b0000000-0000-4000-8000-000000000021', 'Ulrich', 'Bernsdorff', 'ulrich.bernsdorff@alpenland-handel.example', '+49 89 4400213-43', 'user', 'a0000000-0000-4000-8000-000000000004', false, '2026-03-27 14:25:00+00'),
	('b0000000-0000-4000-8000-000000000022', 'Verena', 'Muhlack', 'verena.muhlack@alpenland-handel.example', '+49 89 4400213-44', 'other', 'a0000000-0000-4000-8000-000000000004', false, '2026-04-09 16:05:00+00'),
	('b0000000-0000-4000-8000-000000000023', 'Wolfram', 'Steinkühler', 'wolfram.steinkuehler@stadtwerke-lindau.example', '+49 8382 7011-50', 'decision_maker', 'a0000000-0000-4000-8000-000000000005', true, '2026-04-18 08:30:00+00'),
	('b0000000-0000-4000-8000-000000000024', 'Xenia', 'Aurbacher', 'xenia.aurbacher@stadtwerke-lindau.example', '+49 8382 7011-51', 'influencer', 'a0000000-0000-4000-8000-000000000005', false, '2026-04-18 08:50:00+00'),
	('b0000000-0000-4000-8000-000000000025', 'Yannick', 'Prellwitz', 'yannick.prellwitz@stadtwerke-lindau.example', '', 'user', 'a0000000-0000-4000-8000-000000000005', false, '2026-04-24 13:40:00+00'),
	('b0000000-0000-4000-8000-000000000026', 'Zora', 'Hillebrandt', 'zora.hillebrandt@stadtwerke-lindau.example', '+49 8382 7011-53', 'user', 'a0000000-0000-4000-8000-000000000005', false, '2026-05-07 10:20:00+00'),
	('b0000000-0000-4000-8000-000000000027', 'Albrecht', 'Zwanziger', 'albrecht.zwanziger@stadtwerke-lindau.example', '+49 8382 7011-54', 'other', 'a0000000-0000-4000-8000-000000000005', false, '2026-05-21 15:55:00+00'),
	('b0000000-0000-4000-8000-000000000028', 'Beate', 'Öhlschläger', 'beate.oehlschlaeger@oekotex-manufaktur.example', '+49 351 3390-60', 'decision_maker', 'a0000000-0000-4000-8000-000000000006', true, '2026-05-30 09:05:00+00'),
	('b0000000-0000-4000-8000-000000000029', 'Cornelius', 'Rappenhöner', 'cornelius.rappenhoener@oekotex-manufaktur.example', '', 'user', 'a0000000-0000-4000-8000-000000000006', false, '2026-06-04 11:35:00+00'),
	('b0000000-0000-4000-8000-000000000030', 'Doreen', 'Wittkugel', 'doreen.wittkugel@oekotex-manufaktur.example', '+49 351 3390-62', 'influencer', 'a0000000-0000-4000-8000-000000000006', false, '2026-06-16 14:00:00+00')
ON CONFLICT ("id") DO NOTHING;
