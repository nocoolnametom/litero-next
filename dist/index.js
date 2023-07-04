#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const litero_1 = require("./lib/litero");
const commander_1 = require("commander");
const fs_1 = require("fs");
// Load package.json for version number
const { version } = JSON.parse((0, fs_1.readFileSync)("./package.json", "utf8"));
commander_1.program
    .version(version)
    .helpOption("-h, --help")
    .option("-u, --url <url>", "URL of the story to download")
    .option("-f, --filename <filename>", "Filename to save the story as")
    .option("-c, --classic", "Use the classic website layout")
    .option("-n, --nopages", "Don't write page numbers in output")
    .option("-e, --format <format>", "Format to save the story as", "html")
    .option("-t, --template <template>", "Path to custom template file to use for the story")
    .option("-d, --stream", "Stream the story to stdout")
    .option("--verbose", "Print verbose output")
    .parse();
const litero = new litero_1.Litero(commander_1.program.opts());
litero.getStory(commander_1.program.opts());
