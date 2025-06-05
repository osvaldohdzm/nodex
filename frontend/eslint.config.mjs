// eslint.config.mjs
import globals from "globals"; 
import pluginJs from "@eslint/js"; // Renamed to avoid conflict if you meant something else by 'js' 
import pluginReact from "eslint-plugin-react"; 
import pluginReactHooks from "eslint-plugin-react-hooks"; // Added this 
import { defineConfig } from "eslint/config"; // Keep if using ESLint v9+ style 
 
export default defineConfig([ 
  { 
    files: ["src/**/*.{js,jsx,ts,tsx}"], // Apply to all relevant files in src 
    plugins: { 
      react: pluginReact, 
      "react-hooks": pluginReactHooks, // Register the plugin 
    }, 
    languageOptions: { 
      globals: globals.browser, 
      ecmaVersion: 2021, 
      sourceType: 'module', 
      parserOptions: { 
        ecmaFeatures: { 
          jsx: true, 
        }, 
      }, 
    }, 
    rules: { 
      ...pluginJs.configs.recommended.rules, // Basic JS rules 
      ...pluginReact.configs.recommended.rules, // React specific rules 
      ...pluginReactHooks.configs.recommended.rules, // Rules for Hooks 
      "react/react-in-jsx-scope": "off", // Not needed with new JSX transform 
      "react/jsx-uses-react": "off",    // Not needed with new JSX transform 
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], // Warn on unused vars 
    }, 
    settings: { 
      react: { 
        version: "detect", // Automatically detect React version 
      }, 
    }, 
  } 
]);
