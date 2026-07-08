import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

/**
 * Monatlich am 1. um 03:00 UTC: alle Studiengänge scrapen und cachen.
 * Pro Studiengang wird eine eigene Action per Scheduler gestartet (robuster als ein großer Job).
 */
crons.monthly(
  "scrape all studiengaenge",
  { day: 1, hourUTC: 3, minuteUTC: 0 },
  api.scraping.scrapeAllStudiengaenge
);

/**
 * Täglich um 06:00 UTC = 08:00 CEST: Mensaspeiseplan für heute cachen.
 * Retry um 09:00 UTC = 11:00 CEST: Plan ist dann garantiert vollständig.
 */
crons.daily(
  "scrape mensa",
  { hourUTC: 6, minuteUTC: 0 },
  api.scraping.scrapeMensa
);

crons.daily(
  "scrape mensa retry",
  { hourUTC: 9, minuteUTC: 0 },
  api.scraping.scrapeMensa
);

/**
 * Semestertermine (SoSe): am 15. März zum Semesterbeginn cachen.
 * Convex unterstützt keinen Jahres-Cron – der Job läuft monatlich am 15.,
 * ist aber idempotent (Upsert), also kein Problem für die anderen Monate.
 * Für WiSe-Start (01. Oktober) hier einen weiteren Eintrag ergänzen.
 */
crons.monthly(
  "scrape semester termine",
  { day: 15, hourUTC: 5, minuteUTC: 0 },
  api.scraping.scrapeSemesterTermine
);

export default crons;