import fs from "fs";
import { formatDateTime, replaceAll, saveToFile } from "./helpers";
import path from "path";
import { Story } from "./story";
import { StoryFormat, StoryFormats } from "./storyformats";
import { CLIOptions } from "./storyoptions";
import { Series } from "./series";


const WRITING_ATTEMPT_LOG_MESSAGE = 'Attempting to write to file: "%s1" as %s2';

const templatesPath = path.join(__dirname, "../../templates");

/**
 * Ensures that the incoming arguments are always a {@link CLIOptions} object.
 */
const urlOptionToOptionObj = (url: string | CLIOptions) => {
  if (typeof url == "string") {
    return {
      url,
    } as CLIOptions;
  }
  return url;
};

export const UrlRegex =
  /^(?:https?\:\/\/)?(www\.|german\.|spanish\.|french\.|dutch\.|italian\.|romanian\.|portuguese\.|classic\.)?(?:i\.)?(literotica\.com)(\/s(?:tories)?\/(?:showstory\.php\?(?:url|id)=)?([a-z-0-9]+))$/;

// https://www.literotica.com/series/se/434268
export const SeriesUrlRegex =
  /^(?:https?\:\/\/)?(www\.|german\.|spanish\.|french\.|dutch\.|italian\.|romanian\.|portuguese\.|classic\.)?(?:i\.)?(literotica\.com)(\/series\/se\/([-a-zA-Z0-9]+))$/;

/**
 * Litero class
 *
 * This class handles storing the story and series and writing it to a file.
 * It does not handle downloading the story or parsing the response data, which
 * is handled by the {@link Story} class.
 *
 * @class
 * @classdesc Litero class
 * @param {CLIOptions} [options] - Options for the story
 * @param {boolean} [options.verbose] - Whether to print verbose output
 * @param {Console} [options.logger] - Logger to use for output
 * @param {boolean} [options.stream] - Whether to stream the story to stdout
 * @param {string} [options.format] - Format to save the story as
 * @param {string} [options.template] - Path to custom template file to use for the story
 * @param {boolean} [options.nopages] - Don't write page numbers in output
 * @param {boolean} [options.pageindicator] - Whether to write page indicators in output
 * @param {boolean} [options.classic] - Whether to use the classic website layout
 * @param {boolean} [options.series] - Whether to download all stories in a series
 * @param {string} [options.url] - URL of the story to download
 * @param {string} [options.filename] - Filename to save the story as
 */
export class Litero {
  private _story: Story;
  private _series?: Series;
  private _logger: Console;
  private _verbose: boolean;
  private _stream: boolean;
  private _format: string;
  private _template: string;
  private _templatePath: string;
  private _filename: string;
  private _pageIndicator: boolean;
  private _seriesRequested: string;

  public get story(): Story {
    // No public access to the internal story object
    return this._story.clone();
  }

  constructor({ verbose, logger, stream, template, format, nopages, filename }: CLIOptions = {}) {
    this._logger = logger ?? console;
    this._verbose = verbose ?? false;
    this._stream = stream ?? false;
    this._format = format ?? StoryFormat.HTML;
    this._filename = filename ?? "";
    this._template = "";
    if (template) {
      this._templatePath = fs.existsSync(path.join(process.cwd(), template)) ? path.join(process.cwd(), template) : "";
    } else {
      this._templatePath = fs.existsSync(path.join(templatesPath, `template.${this._format.toLocaleLowerCase()}`))
        ? path.join(templatesPath, `template.${this._format.toLocaleLowerCase()}`)
        : "";
    }
    this._pageIndicator = !nopages;
    this._story = new Story({});
    this._seriesRequested = "";
  }

  public getStory = async (args: string | CLIOptions) => {
    let seriesUrl: string | undefined;
    const options = typeof args == "string" ? urlOptionToOptionObj(args) : args;
    options.classic = options.classic ?? false;
    options.format = options.format || StoryFormat.HTML;
    this._story = new Story({
      classic: options.classic,
      format: options.format as StoryFormat,
      url: options.url,
    });
    if (!this.validateOptions(options)) {
      return;
    }
    if (!this._seriesRequested) {
      this.info(`Getting story from ${this.story.url}`);
      seriesUrl = await this._story.requestPages(this.info);
    } else {
      seriesUrl = this._seriesRequested;
      options.series = true;
    }
    if (seriesUrl && options.series) {
      this._series = new Series(this._story);
      this._series.seriesUrl = this._series.seriesUrl || this._seriesRequested;
      this.info(`Story is part of a series. Getting series from ${seriesUrl}`);
      await this._series.requestSeries(this.info);
    }
    this.info(`Finished downloading all ${this._story.totalPages} pages.`);
    await this.output(options.format as StoryFormat, this._pageIndicator);
  };

  public validateOptions = (options: CLIOptions) => {
    if (!options.url) {
      return this.errorGettingStory("No URL Provided!");
    }

    this._story.url = options.url;

    let url = UrlRegex.exec(this.story.url);

    const seriesUrl = SeriesUrlRegex.exec(this.story.url);

    if (!url) {
      if (!seriesUrl) {
        return this.errorGettingStory("URL Provided was invalid.");
      }
      this._seriesRequested = options.url;
      this._story.inSeries = true;
      url = url || seriesUrl;
    }

    if (options.classic || (url[1] || "").includes("classic")) {
      if (options.series) {
        return this.errorGettingStory("Cannot download series from classic layout!");
      }
      this._story.classic = true;
    }

    if (!options.series && !this._seriesRequested) {
      this._filename = this._filename || url[4];
    }

    if (!Object.hasOwnProperty(`output${this.story.format}`) && !(StoryFormats as string[]).includes(options.format || "")) {
      this.errorGettingStory("Unknown Format provided in the arguments.");
      return false;
    }

    return true;
  };

  public errorGettingStory = (err: string) => {
    const output = [
      `Error : ${err}`,
      "",
      "",
      "Usage:",
      "=".repeat(7),
      "Requires a valid Literotica story URL passed as a string or Javascript object.",
      "",
      "instanceName = new Litero();",
      'URL     : instanceName.getStory("https://literotica.com/s/how-to-write-for-literotica")',
      'Object  : instanceName.getStory({ url : "https://literotica.com/s/how-to-write-for-literotica"})',
      'Object  : instanceName.getStory({ url : "https://literotica.com/s/how-to-write-for-literotica", filename : "writing-stories-litero", format : "html" })',
      "",
    ];
    return this._logger.error(output.join("\n"));
  };

  public info = (msg: string, force = false) => {
    if (this._verbose || force) {
      this._logger.log(`${formatDateTime()} - ${msg}`);
    }
  };

  private loadTemplates = async () => {
    try {
      this._template = this._template || (await fs.promises.readFile(this._templatePath, "utf8"));
    } catch (err) {
      console.error("Error loading templates", err);
      console.info("Please make sure you have the templates folder set up correctly.");
    }
  };

  private output = async (requestedFormat?: `${StoryFormat}`, pageIndicator: boolean = true) => {
    await this.loadTemplates();

    const content = this._series instanceof Series ? this._series.buildContent(pageIndicator) : this.story.buildContent(pageIndicator);
    const title = this._series instanceof Series ? this._series.title ?? this.story.title : this.story.title;
    const posttitle = this._series instanceof Series ? this._series.posttitle ?? this.story.posttitle : this.story.posttitle;
    const author = this._series instanceof Series ? this._series.author ?? this.story.author : this.story.author;
    const authorUrl = this._series instanceof Series ? this._series.authorUrl ?? this.story.authorUrl : this.story.authorUrl;
    const storyUrl = this._series instanceof Series ? this._series.seriesUrl ?? this.story.url : this.story.url;
    const theFilename = this._filename || (this._series instanceof Series ? this._series.firstStoryUrlTitle : this._filename);

    this.info(WRITING_ATTEMPT_LOG_MESSAGE.replace("%s1", title).replace("%s2", theFilename));

    const replacementValues = {
      "%title%": title,
      "%posttitle%": requestedFormat == StoryFormat.HTML ? "" : posttitle,
      "%author%": author,
      "%authorurl%": authorUrl,
      "%content%": content,
      "%postcontent%": requestedFormat == StoryFormat.HTML ? "" : posttitle,
      "%storyurl%": storyUrl,
    };

    const output = replaceAll(this._template, replacementValues);

    if (this._stream) {
      const force = true;
      this.info("The option stream was provided, streaming ~~~~~~~~~~~~");
      this.info(output, force);
      return;
    }

    // Replace the file suffix with the requested format.
    const filename = theFilename.replace(/(\.[a-z]+)?$/, `.${requestedFormat}`);
    await saveToFile(output, filename);
  };
}
