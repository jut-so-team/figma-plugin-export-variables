// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// Initial UI setup with fixed dimensions
figma.showUI(__html__, { width: 300, height: 200, themeColors: true });

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
              const value = variable.valuesByMode[modeId];
              return `--${variable.name}: ${value};`;
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
