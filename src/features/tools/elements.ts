/**
 * Periodic table data: atomic number, symbol, names, standard atomic weight
 * (IUPAC abridged values; bracketed mass numbers for elements without stable
 * isotopes), group, period, block and category. Electron configurations are
 * derived from the Madelung rule with the well-known exceptions listed below.
 * Properties that are not reliably known are deliberately not included.
 */
export type ElementCategory =
  | "alkali"
  | "alkaline"
  | "transition"
  | "post-transition"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble"
  | "lanthanide"
  | "actinide"
  | "unknown";

export interface ChemElement {
  number: number;
  symbol: string;
  name: { de: string; en: string };
  /** Standard atomic weight, or the mass number of the most stable isotope for radioactive elements. */
  mass: number;
  /** True when `mass` is a mass number of an isotope (no standard atomic weight). */
  massIsIsotope: boolean;
  group: number | null; // 1–18, null for f-block
  period: number;
  block: "s" | "p" | "d" | "f";
  category: ElementCategory;
  electronConfiguration: string;
}

// number, symbol, de, en, mass, isotope?, group, period, block, category
type Row = [number, string, string, string, number, boolean, number | null, number, "s" | "p" | "d" | "f", ElementCategory];

const ROWS: Row[] = [
  [1, "H", "Wasserstoff", "Hydrogen", 1.008, false, 1, 1, "s", "nonmetal"],
  [2, "He", "Helium", "Helium", 4.0026, false, 18, 1, "s", "noble"],
  [3, "Li", "Lithium", "Lithium", 6.94, false, 1, 2, "s", "alkali"],
  [4, "Be", "Beryllium", "Beryllium", 9.0122, false, 2, 2, "s", "alkaline"],
  [5, "B", "Bor", "Boron", 10.81, false, 13, 2, "p", "metalloid"],
  [6, "C", "Kohlenstoff", "Carbon", 12.011, false, 14, 2, "p", "nonmetal"],
  [7, "N", "Stickstoff", "Nitrogen", 14.007, false, 15, 2, "p", "nonmetal"],
  [8, "O", "Sauerstoff", "Oxygen", 15.999, false, 16, 2, "p", "nonmetal"],
  [9, "F", "Fluor", "Fluorine", 18.998, false, 17, 2, "p", "halogen"],
  [10, "Ne", "Neon", "Neon", 20.18, false, 18, 2, "p", "noble"],
  [11, "Na", "Natrium", "Sodium", 22.99, false, 1, 3, "s", "alkali"],
  [12, "Mg", "Magnesium", "Magnesium", 24.305, false, 2, 3, "s", "alkaline"],
  [13, "Al", "Aluminium", "Aluminium", 26.982, false, 13, 3, "p", "post-transition"],
  [14, "Si", "Silicium", "Silicon", 28.085, false, 14, 3, "p", "metalloid"],
  [15, "P", "Phosphor", "Phosphorus", 30.974, false, 15, 3, "p", "nonmetal"],
  [16, "S", "Schwefel", "Sulfur", 32.06, false, 16, 3, "p", "nonmetal"],
  [17, "Cl", "Chlor", "Chlorine", 35.45, false, 17, 3, "p", "halogen"],
  [18, "Ar", "Argon", "Argon", 39.95, false, 18, 3, "p", "noble"],
  [19, "K", "Kalium", "Potassium", 39.098, false, 1, 4, "s", "alkali"],
  [20, "Ca", "Calcium", "Calcium", 40.078, false, 2, 4, "s", "alkaline"],
  [21, "Sc", "Scandium", "Scandium", 44.956, false, 3, 4, "d", "transition"],
  [22, "Ti", "Titan", "Titanium", 47.867, false, 4, 4, "d", "transition"],
  [23, "V", "Vanadium", "Vanadium", 50.942, false, 5, 4, "d", "transition"],
  [24, "Cr", "Chrom", "Chromium", 51.996, false, 6, 4, "d", "transition"],
  [25, "Mn", "Mangan", "Manganese", 54.938, false, 7, 4, "d", "transition"],
  [26, "Fe", "Eisen", "Iron", 55.845, false, 8, 4, "d", "transition"],
  [27, "Co", "Cobalt", "Cobalt", 58.933, false, 9, 4, "d", "transition"],
  [28, "Ni", "Nickel", "Nickel", 58.693, false, 10, 4, "d", "transition"],
  [29, "Cu", "Kupfer", "Copper", 63.546, false, 11, 4, "d", "transition"],
  [30, "Zn", "Zink", "Zinc", 65.38, false, 12, 4, "d", "transition"],
  [31, "Ga", "Gallium", "Gallium", 69.723, false, 13, 4, "p", "post-transition"],
  [32, "Ge", "Germanium", "Germanium", 72.63, false, 14, 4, "p", "metalloid"],
  [33, "As", "Arsen", "Arsenic", 74.922, false, 15, 4, "p", "metalloid"],
  [34, "Se", "Selen", "Selenium", 78.971, false, 16, 4, "p", "nonmetal"],
  [35, "Br", "Brom", "Bromine", 79.904, false, 17, 4, "p", "halogen"],
  [36, "Kr", "Krypton", "Krypton", 83.798, false, 18, 4, "p", "noble"],
  [37, "Rb", "Rubidium", "Rubidium", 85.468, false, 1, 5, "s", "alkali"],
  [38, "Sr", "Strontium", "Strontium", 87.62, false, 2, 5, "s", "alkaline"],
  [39, "Y", "Yttrium", "Yttrium", 88.906, false, 3, 5, "d", "transition"],
  [40, "Zr", "Zirconium", "Zirconium", 91.224, false, 4, 5, "d", "transition"],
  [41, "Nb", "Niob", "Niobium", 92.906, false, 5, 5, "d", "transition"],
  [42, "Mo", "Molybdän", "Molybdenum", 95.95, false, 6, 5, "d", "transition"],
  [43, "Tc", "Technetium", "Technetium", 98, true, 7, 5, "d", "transition"],
  [44, "Ru", "Ruthenium", "Ruthenium", 101.07, false, 8, 5, "d", "transition"],
  [45, "Rh", "Rhodium", "Rhodium", 102.91, false, 9, 5, "d", "transition"],
  [46, "Pd", "Palladium", "Palladium", 106.42, false, 10, 5, "d", "transition"],
  [47, "Ag", "Silber", "Silver", 107.87, false, 11, 5, "d", "transition"],
  [48, "Cd", "Cadmium", "Cadmium", 112.41, false, 12, 5, "d", "transition"],
  [49, "In", "Indium", "Indium", 114.82, false, 13, 5, "p", "post-transition"],
  [50, "Sn", "Zinn", "Tin", 118.71, false, 14, 5, "p", "post-transition"],
  [51, "Sb", "Antimon", "Antimony", 121.76, false, 15, 5, "p", "metalloid"],
  [52, "Te", "Tellur", "Tellurium", 127.6, false, 16, 5, "p", "metalloid"],
  [53, "I", "Iod", "Iodine", 126.9, false, 17, 5, "p", "halogen"],
  [54, "Xe", "Xenon", "Xenon", 131.29, false, 18, 5, "p", "noble"],
  [55, "Cs", "Caesium", "Caesium", 132.91, false, 1, 6, "s", "alkali"],
  [56, "Ba", "Barium", "Barium", 137.33, false, 2, 6, "s", "alkaline"],
  [57, "La", "Lanthan", "Lanthanum", 138.91, false, null, 6, "f", "lanthanide"],
  [58, "Ce", "Cer", "Cerium", 140.12, false, null, 6, "f", "lanthanide"],
  [59, "Pr", "Praseodym", "Praseodymium", 140.91, false, null, 6, "f", "lanthanide"],
  [60, "Nd", "Neodym", "Neodymium", 144.24, false, null, 6, "f", "lanthanide"],
  [61, "Pm", "Promethium", "Promethium", 145, true, null, 6, "f", "lanthanide"],
  [62, "Sm", "Samarium", "Samarium", 150.36, false, null, 6, "f", "lanthanide"],
  [63, "Eu", "Europium", "Europium", 151.96, false, null, 6, "f", "lanthanide"],
  [64, "Gd", "Gadolinium", "Gadolinium", 157.25, false, null, 6, "f", "lanthanide"],
  [65, "Tb", "Terbium", "Terbium", 158.93, false, null, 6, "f", "lanthanide"],
  [66, "Dy", "Dysprosium", "Dysprosium", 162.5, false, null, 6, "f", "lanthanide"],
  [67, "Ho", "Holmium", "Holmium", 164.93, false, null, 6, "f", "lanthanide"],
  [68, "Er", "Erbium", "Erbium", 167.26, false, null, 6, "f", "lanthanide"],
  [69, "Tm", "Thulium", "Thulium", 168.93, false, null, 6, "f", "lanthanide"],
  [70, "Yb", "Ytterbium", "Ytterbium", 173.05, false, null, 6, "f", "lanthanide"],
  [71, "Lu", "Lutetium", "Lutetium", 174.97, false, 3, 6, "d", "lanthanide"],
  [72, "Hf", "Hafnium", "Hafnium", 178.49, false, 4, 6, "d", "transition"],
  [73, "Ta", "Tantal", "Tantalum", 180.95, false, 5, 6, "d", "transition"],
  [74, "W", "Wolfram", "Tungsten", 183.84, false, 6, 6, "d", "transition"],
  [75, "Re", "Rhenium", "Rhenium", 186.21, false, 7, 6, "d", "transition"],
  [76, "Os", "Osmium", "Osmium", 190.23, false, 8, 6, "d", "transition"],
  [77, "Ir", "Iridium", "Iridium", 192.22, false, 9, 6, "d", "transition"],
  [78, "Pt", "Platin", "Platinum", 195.08, false, 10, 6, "d", "transition"],
  [79, "Au", "Gold", "Gold", 196.97, false, 11, 6, "d", "transition"],
  [80, "Hg", "Quecksilber", "Mercury", 200.59, false, 12, 6, "d", "transition"],
  [81, "Tl", "Thallium", "Thallium", 204.38, false, 13, 6, "p", "post-transition"],
  [82, "Pb", "Blei", "Lead", 207.2, false, 14, 6, "p", "post-transition"],
  [83, "Bi", "Bismut", "Bismuth", 208.98, false, 15, 6, "p", "post-transition"],
  [84, "Po", "Polonium", "Polonium", 209, true, 16, 6, "p", "post-transition"],
  [85, "At", "Astat", "Astatine", 210, true, 17, 6, "p", "halogen"],
  [86, "Rn", "Radon", "Radon", 222, true, 18, 6, "p", "noble"],
  [87, "Fr", "Francium", "Francium", 223, true, 1, 7, "s", "alkali"],
  [88, "Ra", "Radium", "Radium", 226, true, 2, 7, "s", "alkaline"],
  [89, "Ac", "Actinium", "Actinium", 227, true, null, 7, "f", "actinide"],
  [90, "Th", "Thorium", "Thorium", 232.04, false, null, 7, "f", "actinide"],
  [91, "Pa", "Protactinium", "Protactinium", 231.04, false, null, 7, "f", "actinide"],
  [92, "U", "Uran", "Uranium", 238.03, false, null, 7, "f", "actinide"],
  [93, "Np", "Neptunium", "Neptunium", 237, true, null, 7, "f", "actinide"],
  [94, "Pu", "Plutonium", "Plutonium", 244, true, null, 7, "f", "actinide"],
  [95, "Am", "Americium", "Americium", 243, true, null, 7, "f", "actinide"],
  [96, "Cm", "Curium", "Curium", 247, true, null, 7, "f", "actinide"],
  [97, "Bk", "Berkelium", "Berkelium", 247, true, null, 7, "f", "actinide"],
  [98, "Cf", "Californium", "Californium", 251, true, null, 7, "f", "actinide"],
  [99, "Es", "Einsteinium", "Einsteinium", 252, true, null, 7, "f", "actinide"],
  [100, "Fm", "Fermium", "Fermium", 257, true, null, 7, "f", "actinide"],
  [101, "Md", "Mendelevium", "Mendelevium", 258, true, null, 7, "f", "actinide"],
  [102, "No", "Nobelium", "Nobelium", 259, true, null, 7, "f", "actinide"],
  [103, "Lr", "Lawrencium", "Lawrencium", 266, true, 3, 7, "d", "actinide"],
  [104, "Rf", "Rutherfordium", "Rutherfordium", 267, true, 4, 7, "d", "transition"],
  [105, "Db", "Dubnium", "Dubnium", 268, true, 5, 7, "d", "transition"],
  [106, "Sg", "Seaborgium", "Seaborgium", 269, true, 6, 7, "d", "transition"],
  [107, "Bh", "Bohrium", "Bohrium", 270, true, 7, 7, "d", "transition"],
  [108, "Hs", "Hassium", "Hassium", 269, true, 8, 7, "d", "transition"],
  [109, "Mt", "Meitnerium", "Meitnerium", 278, true, 9, 7, "d", "unknown"],
  [110, "Ds", "Darmstadtium", "Darmstadtium", 281, true, 10, 7, "d", "unknown"],
  [111, "Rg", "Roentgenium", "Roentgenium", 282, true, 11, 7, "d", "unknown"],
  [112, "Cn", "Copernicium", "Copernicium", 285, true, 12, 7, "d", "unknown"],
  [113, "Nh", "Nihonium", "Nihonium", 286, true, 13, 7, "p", "unknown"],
  [114, "Fl", "Flerovium", "Flerovium", 289, true, 14, 7, "p", "unknown"],
  [115, "Mc", "Moscovium", "Moscovium", 290, true, 15, 7, "p", "unknown"],
  [116, "Lv", "Livermorium", "Livermorium", 293, true, 16, 7, "p", "unknown"],
  [117, "Ts", "Tenness", "Tennessine", 294, true, 17, 7, "p", "unknown"],
  [118, "Og", "Oganesson", "Oganesson", 294, true, 18, 7, "p", "unknown"],
];

/** Madelung filling order with capacities. */
const ORBITALS: Array<[string, number]> = [
  ["1s", 2], ["2s", 2], ["2p", 6], ["3s", 2], ["3p", 6], ["4s", 2], ["3d", 10], ["4p", 6], ["5s", 2], ["4d", 10], ["5p", 6],
  ["6s", 2], ["4f", 14], ["5d", 10], ["6p", 6], ["7s", 2], ["5f", 14], ["6d", 10], ["7p", 6],
];

/** Experimentally established exceptions to the Madelung rule (full configurations after the noble-gas core). */
const EXCEPTIONS: Record<number, string> = {
  24: "[Ar] 3d5 4s1",
  29: "[Ar] 3d10 4s1",
  41: "[Kr] 4d4 5s1",
  42: "[Kr] 4d5 5s1",
  44: "[Kr] 4d7 5s1",
  45: "[Kr] 4d8 5s1",
  46: "[Kr] 4d10",
  47: "[Kr] 4d10 5s1",
  57: "[Xe] 5d1 6s2",
  58: "[Xe] 4f1 5d1 6s2",
  64: "[Xe] 4f7 5d1 6s2",
  78: "[Xe] 4f14 5d9 6s1",
  79: "[Xe] 4f14 5d10 6s1",
  89: "[Rn] 6d1 7s2",
  90: "[Rn] 6d2 7s2",
  91: "[Rn] 5f2 6d1 7s2",
  92: "[Rn] 5f3 6d1 7s2",
  93: "[Rn] 5f4 6d1 7s2",
  96: "[Rn] 5f7 6d1 7s2",
  103: "[Rn] 5f14 7s2 7p1",
};

const NOBLE_CORES: Array<[number, string]> = [[86, "Rn"], [54, "Xe"], [36, "Kr"], [18, "Ar"], [10, "Ne"], [2, "He"]];

/** Electron configuration by the Madelung rule, written with a noble-gas core. */
export function madelungConfiguration(z: number): string {
  const core = NOBLE_CORES.find(([n]) => n < z);
  const start = core ? core[0] : 0;
  const parts: string[] = [];
  let filledCore = 0;
  let remaining = z;
  for (const [orb, cap] of ORBITALS) {
    if (remaining <= 0) break;
    const n = Math.min(cap, remaining);
    remaining -= n;
    if (filledCore < start) {
      filledCore += n;
      continue;
    }
    parts.push(`${orb}${n}`);
  }
  // Present s before d/f of the same shell like textbooks do? Keep filling order but sort by shell number, then subshell.
  const order: Record<string, number> = { s: 0, p: 1, d: 2, f: 3 };
  parts.sort((a, b) => {
    const [na, la] = [Number(a[0]), a[1]];
    const [nb, lb] = [Number(b[0]), b[1]];
    return na - nb || order[la] - order[lb];
  });
  return `${core ? `[${core[1]}] ` : ""}${parts.join(" ")}`;
}

export const ELEMENTS: ChemElement[] = ROWS.map(([number, symbol, de, en, mass, massIsIsotope, group, period, block, category]) => ({
  number,
  symbol,
  name: { de, en },
  mass,
  massIsIsotope,
  group,
  period,
  block,
  category,
  electronConfiguration: EXCEPTIONS[number] ?? madelungConfiguration(number),
}));

export const CATEGORY_LABELS: Record<ElementCategory, { de: string; en: string; color: string }> = {
  alkali: { de: "Alkalimetall", en: "Alkali metal", color: "#fca5a5" },
  alkaline: { de: "Erdalkalimetall", en: "Alkaline earth metal", color: "#fdba74" },
  transition: { de: "Übergangsmetall", en: "Transition metal", color: "#fde68a" },
  "post-transition": { de: "Metall", en: "Post-transition metal", color: "#bef264" },
  metalloid: { de: "Halbmetall", en: "Metalloid", color: "#86efac" },
  nonmetal: { de: "Nichtmetall", en: "Nonmetal", color: "#99f6e4" },
  halogen: { de: "Halogen", en: "Halogen", color: "#a5f3fc" },
  noble: { de: "Edelgas", en: "Noble gas", color: "#c7d2fe" },
  lanthanide: { de: "Lanthanoid", en: "Lanthanide", color: "#f5d0fe" },
  actinide: { de: "Actinoid", en: "Actinide", color: "#fbcfe8" },
  unknown: { de: "Eigenschaften unbekannt", en: "Unknown properties", color: "#e5e7eb" },
};

/** Grid position (column 1–18, row 1–9) for the classic 18-column layout with f-block below. */
export function gridPosition(el: ChemElement): { col: number; row: number } {
  if (el.block === "f" && el.group === null) {
    const base = el.category === "lanthanide" ? 57 : 89;
    return { col: 3 + (el.number - base), row: el.category === "lanthanide" ? 9 : 10 };
  }
  return { col: el.group ?? 3, row: el.period };
}
