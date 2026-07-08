export type SpoSourceConfig = {
  sourceId: string;
  title: string;
  major: string;
  documentUrl: string;
  sourcePageUrl: string;
};

export const spoSources: SpoSourceConfig[] = [
  {
    sourceId: "media-engineering-beng",
    title: "Studien- und Prüfungsordnung Media Engineering (B.Eng.)",
    major: "Media Engineering (B.Eng.)",
    documentUrl:
      "https://www.th-nuernberg.de/fileadmin/zentrale-einrichtungen/szs/sb/sb_docs/SPOs/Elektrotechnik_Feinwerktechnik_Informationstechnik/Bachelor/spoB-ME_aktuell.pdf",
    sourcePageUrl: "https://www.th-nuernberg.de/studiengang/media-engineering-beng/",
  },
];

export const defaultSpoSourceId = spoSources[0]?.sourceId ?? "default";
