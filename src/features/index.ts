import type { Feature } from '../core/feature';
import { base } from './base';
import { frameworkExpress } from './framework-express';
import { lintEslint } from './lint-eslint';
import { testingVitest } from './testing-vitest';

/** Every feature, in the order ties are broken. `dependsOn` decides the rest. */
export const features: Feature[] = [base, frameworkExpress, testingVitest, lintEslint];
