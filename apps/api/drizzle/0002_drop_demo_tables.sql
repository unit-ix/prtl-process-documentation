-- Rückstand des Templates: `companies` und `contacts` samt ihrer Enum-Typen stammen aus der
-- Demo-Domäne und wurden vom neu generierten 0000 nur nicht mehr angelegt — gelöscht hat sie
-- niemand. Eine Tabelle, die kein Code kennt, ist eine Falle: sie taucht in jedem \dt auf, in
-- jedem Backup und in jeder Frage "wofür ist die eigentlich da?".
--
-- Destruktives DDL: der Prod-Gate in scripts/deploy-azure.mjs bricht deshalb ab und verlangt
-- --allow-destructive. Das ist hier richtig und gewollt — in Prod stehen in diesen beiden
-- Tabellen ebenfalls nur Demo-Zeilen.
DROP TABLE IF EXISTS "contacts";--> statement-breakpoint
DROP TABLE IF EXISTS "companies";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."contact_role";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."company_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."industry";
