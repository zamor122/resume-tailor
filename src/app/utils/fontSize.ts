// Utility function to get font size classes
export function getFontSizeClass(fontSize: "small" | "medium" | "large" = "medium"): string {
  switch (fontSize) {
    case "small":
      return "text-xs";
    case "medium":
      return "text-sm";
    case "large":
      return "text-base";
    default:
      return "text-sm";
  }
}

// Get font size for prose/content areas
export function getProseFontSizeClass(fontSize: "small" | "medium" | "large" = "medium"): string {
  switch (fontSize) {
    case "small":
      return "prose-sm";
    case "medium":
      return "prose";
    case "large":
      return "prose-lg";
    default:
      return "prose";
  }
}

// Get font size for textareas/inputs
export function getInputFontSizeClass(fontSize: "small" | "medium" | "large" = "medium"): string {
  switch (fontSize) {
    case "small":
      return "text-xs";
    case "medium":
      return "text-sm";
    case "large":
      return "text-base";
    default:
      return "text-sm";
  }
}

