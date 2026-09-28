import type { SchoolPaletteId } from "@/lib/types";

export type SchoolPalette = {
  id: SchoolPaletteId;
  name: string;
  category: "State universities" | "Private universities";
  colors: readonly string[];
  uiPrimary: string;
  uiPrimaryStrong: string;
  uiAccent: string;
};

export const schoolPalettes: readonly SchoolPalette[] = [
  {
    id: "university-of-cebu",
    name: "University of Cebu",
    category: "Private universities",
    colors: ["#0755a5", "#f5c400", "#ffffff"],
    uiPrimary: "#0755a5",
    uiPrimaryStrong: "#063b73",
    uiAccent: "#d6a900",
  },
  {
    id: "university-of-the-philippines",
    name: "University of the Philippines",
    category: "State universities",
    colors: ["#7b1113", "#014421", "#ffffff"],
    uiPrimary: "#7b1113",
    uiPrimaryStrong: "#510b0d",
    uiAccent: "#147045",
  },
  {
    id: "cebu-normal-university",
    name: "Cebu Normal University",
    category: "State universities",
    colors: ["#9d2235", "#f4b942", "#ffffff"],
    uiPrimary: "#9d2235",
    uiPrimaryStrong: "#661624",
    uiAccent: "#bd8513",
  },
  {
    id: "cebu-technological-university",
    name: "Cebu Technological University",
    category: "State universities",
    colors: ["#007a5e", "#b21e35", "#f2c230", "#165c8d"],
    uiPrimary: "#165c8d",
    uiPrimaryStrong: "#0e3c5d",
    uiAccent: "#b1840c",
  },
  {
    id: "polytechnic-university-of-the-philippines",
    name: "Polytechnic University of the Philippines",
    category: "State universities",
    colors: ["#800000", "#f6c344", "#ffffff"],
    uiPrimary: "#800000",
    uiPrimaryStrong: "#520000",
    uiAccent: "#bd8910",
  },
  {
    id: "mindanao-state-university",
    name: "Mindanao State University",
    category: "State universities",
    colors: ["#7a1731", "#d6a928", "#ffffff"],
    uiPrimary: "#7a1731",
    uiPrimaryStrong: "#501020",
    uiAccent: "#ac8110",
  },
  {
    id: "west-visayas-state-university",
    name: "West Visayas State University",
    category: "State universities",
    colors: ["#174a82", "#e3b341", "#ffffff"],
    uiPrimary: "#174a82",
    uiPrimaryStrong: "#0d3158",
    uiAccent: "#b48514",
  },
  {
    id: "bicol-university",
    name: "Bicol University",
    category: "State universities",
    colors: ["#a61d2d", "#f0b323", "#ffffff"],
    uiPrimary: "#a61d2d",
    uiPrimaryStrong: "#6f131e",
    uiAccent: "#b9820d",
  },
  {
    id: "central-luzon-state-university",
    name: "Central Luzon State University",
    category: "State universities",
    colors: ["#008000", "#ffd700", "#ffffff"],
    uiPrimary: "#006b36",
    uiPrimaryStrong: "#004724",
    uiAccent: "#b59600",
  },
  {
    id: "ateneo-de-manila",
    name: "Ateneo de Manila University",
    category: "Private universities",
    colors: ["#003a70", "#f2b134", "#ffffff"],
    uiPrimary: "#003a70",
    uiPrimaryStrong: "#00264a",
    uiAccent: "#c18412",
  },
  {
    id: "de-la-salle-university",
    name: "De La Salle University",
    category: "Private universities",
    colors: ["#00703c", "#ffffff", "#d4af37"],
    uiPrimary: "#00703c",
    uiPrimaryStrong: "#004b29",
    uiAccent: "#a37d0c",
  },
  {
    id: "university-of-santo-tomas",
    name: "University of Santo Tomas",
    category: "Private universities",
    colors: ["#f4c430", "#1b1b1b", "#ffffff"],
    uiPrimary: "#615018",
    uiPrimaryStrong: "#332a0d",
    uiAccent: "#d4a900",
  },
  {
    id: "university-of-san-carlos",
    name: "University of San Carlos",
    category: "Private universities",
    colors: ["#006633", "#f5c400", "#ffffff"],
    uiPrimary: "#006633",
    uiPrimaryStrong: "#004221",
    uiAccent: "#c99f00",
  },
] as const;

export function getSchoolPalette(id: SchoolPaletteId): SchoolPalette {
  return schoolPalettes.find((palette) => palette.id === id) ?? schoolPalettes[0];
}
