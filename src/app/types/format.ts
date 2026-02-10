export interface FormatSpec {
  fontFamily: string;
  fontSize: { base: number; heading: number; subheading: number };
  margins: { top: number; right: number; bottom: number; left: number };
  lineHeight: number;
  layout: "single-column" | "two-column-skills";
  sectionOrder: string[];
  style: "traditional" | "modern" | "minimal";
  colorScheme: "black-white" | "subtle-accent";
}
