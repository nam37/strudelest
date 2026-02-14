import type { TemplateDefinition } from "../../types/music";
import { ambientDriftTemplate } from "./ambientDrift";
import { ambientDriftNewTemplate } from "./ambientDriftNew";
import { breakbeatPulseTemplate } from "./breakbeatPulse";
import { breakbeatPulseNewTemplate } from "./breakbeatPulseNew";
import { chillwaveVibesTemplate } from "./chillwaveVibes";
import { minimalGrooveTemplate } from "./minimalGroove";
import { minimalGrooveNewTemplate } from "./minimalGrooveNew";
import { oldSchoolHipHopTemplate } from "./oldSchoolHipHop";
import { polyrhythmGridTemplate } from "./polyrhythmGrid";
import { swingGrooveTemplate } from "./swingGroove";
import { technoDriveTemplate } from "./technoDrive";

export const templates: TemplateDefinition[] = [
  technoDriveTemplate,
  oldSchoolHipHopTemplate,
  minimalGrooveTemplate,
  minimalGrooveNewTemplate,
  ambientDriftTemplate,
  ambientDriftNewTemplate,
  breakbeatPulseTemplate,
  breakbeatPulseNewTemplate,
  polyrhythmGridTemplate,
  swingGrooveTemplate,
  chillwaveVibesTemplate
];
