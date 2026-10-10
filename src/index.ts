#!/usr/bin/env node
import { runMain } from 'citty';
import { main } from './cli/main';

await runMain(main);
