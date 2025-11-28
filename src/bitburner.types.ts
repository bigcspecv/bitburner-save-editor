// Re-export everything from the modular barrel
export * from "./bitburner";

// IMPORTANT: For backward compatibility, also re-export the Bitburner namespace value
// This ensures runtime access to enums like Bitburner.SaveDataKey
import { Bitburner } from "./bitburner";
export { Bitburner };
