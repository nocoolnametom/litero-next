#!/usr/bin/env node
import { Litero, GetStoryOptions } from "./lib/litero";
import { program } from "commander";
import { readFileSync } from 'fs';

// Load package.json for version number
const { version } = JSON.parse(readFileSync("./package.json", "utf8"));  

program
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

const litero = new Litero(program.opts() as unknown as GetStoryOptions);

litero.getStory(program.opts() as unknown as GetStoryOptions);
