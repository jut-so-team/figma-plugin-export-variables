// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// Initial UI setup with fixed dimensions
figma.showUI(__html__, { width: 300, height: 500, themeColors: true });

// Helper function to resolve variable references recursively
async function resolveVariableValue(
  value: VariableValue,
  depth = 0
): Promise<VariableValue> {
  // Prevent infinite recursion
  if (depth > 10) return value;

  if (value && typeof value === "object") {
    // Handle variable references
    if ("type" in value && value.type === "VARIABLE_ALIAS") {
      const referencedVar = await figma.variables.getVariableByIdAsync(
        value.id
      );
      if (referencedVar) {
        const refModeId = Object.keys(referencedVar.valuesByMode)[0];
        const resolvedValue = referencedVar.valuesByMode[refModeId];
        // Recursively resolve the referenced value
        return resolveVariableValue(resolvedValue, depth + 1);
      }
    }
    // Handle color values
    if ("r" in value && "g" in value && "b" in value) {
      return value;
    }
  }
  return value;
}

// Helper function to format the final value
function formatValue(value: VariableValue): string {
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "string") {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "r" in value &&
    "g" in value &&
    "b" in value
  ) {
    // Convert RGB color to hex
    const r = Math.round(value.r * 255);
    const g = Math.round(value.g * 255);
    const b = Math.round(value.b * 255);
    const rHex = r.toString(16).padStart(2, "0");
    const gHex = g.toString(16).padStart(2, "0");
    const bHex = b.toString(16).padStart(2, "0");
    return `#${rHex}${gHex}${bHex}`;
  }
  return "initial";
}

figma.ui.onmessage = async (msg: { type: string }) => {
  if (msg.type === "export-to-css") {
    try {
      const localCollections =
        await figma.variables.getLocalVariableCollectionsAsync();

      const cssPromises = localCollections.map(async (collection) => {
        const variableDeclarations = await Promise.all(
          collection.variableIds.map(async (variableId) => {
            const variable = await figma.variables.getVariableByIdAsync(
              variableId
            );
            if (variable) {
              const modeId = Object.keys(variable.valuesByMode)[0];
              const rawValue = variable.valuesByMode[modeId];

              // Resolve and format the value
              const resolvedValue = await resolveVariableValue(rawValue);
              const formattedValue = formatValue(resolvedValue);

              return `--${variable.name}: ${formattedValue};`;
            }
            return "";
          })
        );
        return `:root {\n  ${variableDeclarations.join("\n  ")}\n}`;
      });

      const css = (await Promise.all(cssPromises)).join("\n\n");

      // Resize window for preview and send CSS
      figma.ui.resize(600, 500);
      figma.ui.postMessage({ type: "css-exported", css });
    } catch (error) {
      console.error("Error exporting to CSS:", error);
    }
  }
};
