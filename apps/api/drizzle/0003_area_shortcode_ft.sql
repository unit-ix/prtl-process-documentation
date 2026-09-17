-- Q5, abschliessend geklärt: die Kurzbezeichnung speist das Identkennzeichen (§5.2), und ein
-- Schrägstrich darin ("VA PE 2 F/T.001") wird in Dateinamen, Exporten und handgetippten Verweisen
-- zum Problem. Kunde entscheidet: ohne Schrägstrich. Titel und Prozessart bleiben unverändert.
--
-- Als eigene Migration und nicht als Änderung an 0001: 0001 ist auf app_dev bereits gelaufen.
-- Eine bereits angewendete Migration nachträglich zu editieren hiesse, zwei Datenbanken mit
-- derselben Nummer und verschiedenem Inhalt zu haben.
UPDATE "areas" SET "short_code" = 'FT' WHERE "short_code" = 'F/T';
