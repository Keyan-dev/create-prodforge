#!/usr/bin/env node
import { runMain } from 'citty';
import { addCommand, main } from './cli/main';

// `add` is a subcommand, so a new project can't be called "add".
const [command, ...rest] = process.argv.slice(2);
await (command === 'add' ? runMain(addCommand, { rawArgs: rest }) : runMain(main));
