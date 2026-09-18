import { create, all, type MathJsInstance } from "mathjs";

/**
 * Unit conversion on top of mathjs. Only the curated units below are
 * offered in the UI; the conversion itself is delegated to mathjs so no
 * factors are maintained by hand.
 */
let math: MathJsInstance | null = null;
export function getMath(): MathJsInstance {
  if (!math) {
    math = create(all, {});
    // A few common units mathjs does not ship. Factors are exact definitions
    // (nautical mile, knot, light year, thermochemical calorie) or the CODATA
    // value (atomic mass unit).
    math.createUnit("nmi", { definition: "1852 m" });
    math.createUnit("knot", { definition: "1 nmi/h" });
    math.createUnit("lightyear", { definition: "9460730472580800 m" });
    math.createUnit("cal", { definition: "4.184 J", prefixes: "short" });
    math.createUnit("u", { definition: "1.66053907e-27 kg" });
    // Disable functions that could touch the environment or mutate the instance.
    const disabled = () => {
      throw new Error("Function is disabled");
    };
    math.import({ import: disabled, createUnit: disabled, evaluate: disabled, parse: disabled, simplify: disabled, derivative: disabled }, { override: true });
  }
  return math;
}

export interface UnitDef {
  /** mathjs unit name */
  id: string;
  /** Display symbol */
  symbol: string;
  /** Label keys (German / English) */
  de: string;
  en: string;
}

export interface UnitCategory {
  id: string;
  de: string;
  en: string;
  units: UnitDef[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: "length",
    de: "Länge",
    en: "Length",
    units: [
      { id: "mm", symbol: "mm", de: "Millimeter", en: "Millimetre" },
      { id: "cm", symbol: "cm", de: "Zentimeter", en: "Centimetre" },
      { id: "m", symbol: "m", de: "Meter", en: "Metre" },
      { id: "km", symbol: "km", de: "Kilometer", en: "Kilometre" },
      { id: "inch", symbol: "in", de: "Zoll", en: "Inch" },
      { id: "foot", symbol: "ft", de: "Fuß", en: "Foot" },
      { id: "yard", symbol: "yd", de: "Yard", en: "Yard" },
      { id: "mile", symbol: "mi", de: "Meile", en: "Mile" },
      { id: "nmi", symbol: "nmi", de: "Seemeile", en: "Nautical mile" },
      { id: "angstrom", symbol: "Å", de: "Ångström", en: "Ångström" },
      { id: "lightyear", symbol: "ly", de: "Lichtjahr", en: "Light year" },
    ],
  },
  {
    id: "mass",
    de: "Masse",
    en: "Mass",
    units: [
      { id: "mg", symbol: "mg", de: "Milligramm", en: "Milligram" },
      { id: "g", symbol: "g", de: "Gramm", en: "Gram" },
      { id: "kg", symbol: "kg", de: "Kilogramm", en: "Kilogram" },
      { id: "tonne", symbol: "t", de: "Tonne", en: "Tonne" },
      { id: "ounce", symbol: "oz", de: "Unze", en: "Ounce" },
      { id: "lb", symbol: "lb", de: "Pfund (lb)", en: "Pound" },
      { id: "u", symbol: "u", de: "Atomare Masseneinheit", en: "Atomic mass unit" },
    ],
  },
  {
    id: "time",
    de: "Zeit",
    en: "Time",
    units: [
      { id: "ms", symbol: "ms", de: "Millisekunde", en: "Millisecond" },
      { id: "s", symbol: "s", de: "Sekunde", en: "Second" },
      { id: "minute", symbol: "min", de: "Minute", en: "Minute" },
      { id: "hour", symbol: "h", de: "Stunde", en: "Hour" },
      { id: "day", symbol: "d", de: "Tag", en: "Day" },
      { id: "week", symbol: "wk", de: "Woche", en: "Week" },
      { id: "year", symbol: "a", de: "Jahr", en: "Year" },
    ],
  },
  {
    id: "temperature",
    de: "Temperatur",
    en: "Temperature",
    units: [
      { id: "degC", symbol: "°C", de: "Grad Celsius", en: "Degree Celsius" },
      { id: "K", symbol: "K", de: "Kelvin", en: "Kelvin" },
      { id: "degF", symbol: "°F", de: "Grad Fahrenheit", en: "Degree Fahrenheit" },
    ],
  },
  {
    id: "area",
    de: "Fläche",
    en: "Area",
    units: [
      { id: "mm2", symbol: "mm²", de: "Quadratmillimeter", en: "Square millimetre" },
      { id: "cm2", symbol: "cm²", de: "Quadratzentimeter", en: "Square centimetre" },
      { id: "m2", symbol: "m²", de: "Quadratmeter", en: "Square metre" },
      { id: "hectare", symbol: "ha", de: "Hektar", en: "Hectare" },
      { id: "km2", symbol: "km²", de: "Quadratkilometer", en: "Square kilometre" },
      { id: "sqin", symbol: "in²", de: "Quadratzoll", en: "Square inch" },
      { id: "sqft", symbol: "ft²", de: "Quadratfuß", en: "Square foot" },
      { id: "acre", symbol: "ac", de: "Acre", en: "Acre" },
    ],
  },
  {
    id: "volume",
    de: "Volumen",
    en: "Volume",
    units: [
      { id: "ml", symbol: "ml", de: "Milliliter", en: "Millilitre" },
      { id: "l", symbol: "l", de: "Liter", en: "Litre" },
      { id: "cm3", symbol: "cm³", de: "Kubikzentimeter", en: "Cubic centimetre" },
      { id: "m3", symbol: "m³", de: "Kubikmeter", en: "Cubic metre" },
      { id: "teaspoon", symbol: "tsp", de: "Teelöffel (US)", en: "Teaspoon (US)" },
      { id: "tablespoon", symbol: "tbsp", de: "Esslöffel (US)", en: "Tablespoon (US)" },
      { id: "cup", symbol: "cup", de: "Cup (US)", en: "Cup (US)" },
      { id: "gallon", symbol: "gal", de: "Gallone (US)", en: "Gallon (US)" },
    ],
  },
  {
    id: "speed",
    de: "Geschwindigkeit",
    en: "Speed",
    units: [
      { id: "m/s", symbol: "m/s", de: "Meter pro Sekunde", en: "Metres per second" },
      { id: "km/h", symbol: "km/h", de: "Kilometer pro Stunde", en: "Kilometres per hour" },
      { id: "mile/h", symbol: "mph", de: "Meilen pro Stunde", en: "Miles per hour" },
      { id: "knot", symbol: "kn", de: "Knoten", en: "Knot" },
    ],
  },
  {
    id: "force",
    de: "Kraft",
    en: "Force",
    units: [
      { id: "N", symbol: "N", de: "Newton", en: "Newton" },
      { id: "kN", symbol: "kN", de: "Kilonewton", en: "Kilonewton" },
      { id: "dyne", symbol: "dyn", de: "Dyn", en: "Dyne" },
      { id: "lbf", symbol: "lbf", de: "Pound-force", en: "Pound-force" },
    ],
  },
  {
    id: "pressure",
    de: "Druck",
    en: "Pressure",
    units: [
      { id: "Pa", symbol: "Pa", de: "Pascal", en: "Pascal" },
      { id: "hPa", symbol: "hPa", de: "Hektopascal", en: "Hectopascal" },
      { id: "kPa", symbol: "kPa", de: "Kilopascal", en: "Kilopascal" },
      { id: "bar", symbol: "bar", de: "Bar", en: "Bar" },
      { id: "atm", symbol: "atm", de: "Atmosphäre", en: "Atmosphere" },
      { id: "torr", symbol: "Torr", de: "Torr", en: "Torr" },
      { id: "psi", symbol: "psi", de: "Pfund pro Quadratzoll", en: "Pound per square inch" },
    ],
  },
  {
    id: "energy",
    de: "Energie",
    en: "Energy",
    units: [
      { id: "J", symbol: "J", de: "Joule", en: "Joule" },
      { id: "kJ", symbol: "kJ", de: "Kilojoule", en: "Kilojoule" },
      { id: "cal", symbol: "cal", de: "Kalorie", en: "Calorie" },
      { id: "kcal", symbol: "kcal", de: "Kilokalorie", en: "Kilocalorie" },
      { id: "Wh", symbol: "Wh", de: "Wattstunde", en: "Watt hour" },
      { id: "kWh", symbol: "kWh", de: "Kilowattstunde", en: "Kilowatt hour" },
      { id: "eV", symbol: "eV", de: "Elektronenvolt", en: "Electronvolt" },
    ],
  },
  {
    id: "power",
    de: "Leistung",
    en: "Power",
    units: [
      { id: "W", symbol: "W", de: "Watt", en: "Watt" },
      { id: "kW", symbol: "kW", de: "Kilowatt", en: "Kilowatt" },
      { id: "MW", symbol: "MW", de: "Megawatt", en: "Megawatt" },
      { id: "hp", symbol: "hp", de: "Pferdestärke (hp)", en: "Horsepower" },
    ],
  },
  {
    id: "data",
    de: "Datenmenge",
    en: "Data",
    units: [
      { id: "bit", symbol: "bit", de: "Bit", en: "Bit" },
      { id: "byte", symbol: "B", de: "Byte", en: "Byte" },
      { id: "kB", symbol: "kB", de: "Kilobyte", en: "Kilobyte" },
      { id: "MB", symbol: "MB", de: "Megabyte", en: "Megabyte" },
      { id: "GB", symbol: "GB", de: "Gigabyte", en: "Gigabyte" },
      { id: "TB", symbol: "TB", de: "Terabyte", en: "Terabyte" },
    ],
  },
  {
    id: "angle",
    de: "Winkel",
    en: "Angle",
    units: [
      { id: "deg", symbol: "°", de: "Grad", en: "Degree" },
      { id: "rad", symbol: "rad", de: "Radiant", en: "Radian" },
      { id: "grad", symbol: "gon", de: "Gon", en: "Gradian" },
    ],
  },
  {
    id: "frequency",
    de: "Frequenz",
    en: "Frequency",
    units: [
      { id: "Hz", symbol: "Hz", de: "Hertz", en: "Hertz" },
      { id: "kHz", symbol: "kHz", de: "Kilohertz", en: "Kilohertz" },
      { id: "MHz", symbol: "MHz", de: "Megahertz", en: "Megahertz" },
      { id: "GHz", symbol: "GHz", de: "Gigahertz", en: "Gigahertz" },
    ],
  },
  {
    id: "current",
    de: "Stromstärke",
    en: "Electric current",
    units: [
      { id: "mA", symbol: "mA", de: "Milliampere", en: "Milliampere" },
      { id: "A", symbol: "A", de: "Ampere", en: "Ampere" },
    ],
  },
  {
    id: "voltage",
    de: "Spannung",
    en: "Voltage",
    units: [
      { id: "mV", symbol: "mV", de: "Millivolt", en: "Millivolt" },
      { id: "V", symbol: "V", de: "Volt", en: "Volt" },
      { id: "kV", symbol: "kV", de: "Kilovolt", en: "Kilovolt" },
    ],
  },
  {
    id: "resistance",
    de: "Widerstand",
    en: "Resistance",
    units: [
      { id: "ohm", symbol: "Ω", de: "Ohm", en: "Ohm" },
      { id: "kohm", symbol: "kΩ", de: "Kiloohm", en: "Kiloohm" },
      { id: "Mohm", symbol: "MΩ", de: "Megaohm", en: "Megaohm" },
    ],
  },
  {
    id: "capacitance",
    de: "Kapazität",
    en: "Capacitance",
    units: [
      { id: "pF", symbol: "pF", de: "Picofarad", en: "Picofarad" },
      { id: "nF", symbol: "nF", de: "Nanofarad", en: "Nanofarad" },
      { id: "uF", symbol: "µF", de: "Mikrofarad", en: "Microfarad" },
      { id: "F", symbol: "F", de: "Farad", en: "Farad" },
    ],
  },
];

/** Convert a value between two units of the same category. Throws on incompatible units. */
export function convertUnit(value: number, from: string, to: string): number {
  const m = getMath();
  return m.unit(value, from).toNumber(to);
}

/** Format a converted number: up to 10 significant digits, trailing zeros trimmed. */
export function formatNumber(n: number, locale = "de"): string {
  if (!Number.isFinite(n)) return "–";
  const abs = Math.abs(n);
  let s: string;
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) s = n.toExponential(6).replace(/\.?0+e/, "e");
  else s = String(Number(n.toPrecision(10)));
  return locale === "de" ? s.replace(".", ",") : s;
}
