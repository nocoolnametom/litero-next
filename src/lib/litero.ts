import fs from "fs";
import { load } from "cheerio";
import { marked } from "marked";
import { uniqueRandomArray, formatDateTime, replaceAll, saveToFile, arrayOfOtherPages } from "./helpers";
import path from "path";
import userAgents from "./useragents.json";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";
import Europa from "node-europa";

const getRandomUserAgent = uniqueRandomArray(userAgents);
const sanitize = DOMPurify(new JSDOM("").window).sanitize;
const parse = (html: string) => new Europa().convert(sanitize(html).replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ""));
marked.use({
  mangle: false,
  headerIds: false,
});

const WRITING_ATTEMPT_LOG_MESSAGE = 'Attempting to write to file: "%s1" as %s2';

const templatesPath = path.join(__dirname, "../../templates");

interface StoryRequest {
  path: string;
  host: string;
  page: number;
  headers: {
    [header: string]: string;
  };
}

enum StoryFormat {
  HTML = "html",
  TXT = "txt",
  MD = "md",
}

export interface GetStoryOptions {
  url?: string;
  filename?: string;
  format?: string;
  version?: boolean;
  help?: boolean;
  verbose?: boolean;
  classic?: boolean;
  stream?: boolean;
  template?: string;
  nopages?: boolean;
  pageindicator?: boolean;
  logger?: Console;
}

const urlOptionToOptionObj = (url: string | GetStoryOptions) => {
  if (typeof url == "string") {
    return {
      url,
    } as GetStoryOptions;
  }
  return url;
};

export class Story {
  classic: boolean;
  author: string;
  authorURL: string;
  filename: string;
  format: `${StoryFormat}`;
  nobr: boolean;
  pages: string[];
  request?: StoryRequest;
  title: string;
  totalPages: number;
  pagesDone: number;
  url: string;

  constructor({
    classic,
    title,
    url,
    author,
    authorURL,
    totalPages,
    pages,
    pagesDone,
    format,
    nobr,
    request,
    filename,
  }: {
    classic?: boolean;
    author?: string;
    authorURL?: string;
    filename?: string;
    format?: `${StoryFormat}`;
    nobr?: boolean;
    pages?: string[];
    request?: StoryRequest;
    stream?: boolean;
    title?: string;
    totalPages?: number;
    pagesDone?: number;
    url?: string;
  }) {
    this.classic = classic ?? false;
    this.author = author || "";
    this.authorURL = authorURL || "";
    this.filename = filename || "";
    this.format = format || StoryFormat.HTML;
    this.nobr = nobr ?? true;
    this.pages = pages || [];
    this.request = request;
    this.title = title || "";
    this.totalPages = totalPages || 0;
    this.pagesDone = pagesDone || 0;
    this.url = url || "";
  }

  public get sep(): string {
    return this.format != StoryFormat.HTML ? "\n" : this.nobr ? "</p><p>" : "<br />";
  }

  // A row of dashes to separate the title from the content for non-html formats
  public get posttitle(): string {
    return this.format == StoryFormat.HTML ? "" : "-".repeat(this.title.length);
  }

  buildContent = (pageIndicator = true) => {
    const sep = this.format != StoryFormat.HTML ? "\n" : this.nobr ? "</p><p>" : "<br />";

    const joinedContent = this.pages
      .reduce((acc, page, i) => {
        const fullPage = this.format != StoryFormat.HTML ? page : marked.parse(page);
        if (i == 0) {
          return [fullPage];
        }
        if (pageIndicator) {
          return acc.concat(["", `Page ${i + 1}:`, `${"-".repeat(10)}`, "", fullPage]);
        }
        return acc.concat(["", fullPage]);
      }, [] as string[])
      .join(sep);
    const content = this.format == StoryFormat.HTML ? joinedContent.replace(/(?:\r\b|\r|\n)/g, sep) : joinedContent;
    return content;
  };

  requestPages = async (info: Function = () => {}) => {
    await this.requestFirstPage(info);
    await this.requestOtherPages(info);
  };

  requestFirstPage = async (info: Function = () => {}) => {
    await this.requestPage(info)(1);
  };

  requestOtherPages = async (info: Function = () => {}) => {
    if (this.totalPages <= 1) {
      return;
    }
    const pagesToGet = arrayOfOtherPages(this.totalPages);
    await Promise.all(pagesToGet.map(this.requestPage(info)));
  };

  getTotalPages = ($: ReturnType<typeof load>) => {
    if (this.totalPages) {
      return this.totalPages;
    }

    if (this.classic) {
      return $(".b-pager-pages select option").length;
    }

    return parseInt($(".l_bH a.l_bJ").last().text(), 10) ?? 1;
  };

  requestPage =
    (info: Function = () => {}) =>
    async (pageNum = 1) => {
      // If the story has no known pages, then we're requesting the first page
      const firstPage = !this.totalPages;
      const { path, host, headers } = this.request || ({} as StoryRequest);
      if (!path || !host) {
        console.error(`Looking up the story page ${pageNum} failed. Please try again later.`);
        return;
      }
      let html: string;
      try {
        const url = firstPage ? `https://${host}${path}` : `https://${host}${path}?page=${pageNum}`;
        info(`Requesting page - ${pageNum} - ${url}`);
        const page = await fetch(url, { headers });
        html = await page.text();
      } catch (err) {
        info("Error getting the story. Well, that sucks. Please try again later.");
        info(err);
        return;
      }

      const $ = load(html);

      // Get the total pages from the classic page if we don't already know it
      this.totalPages = this.getTotalPages($);

      if (this.totalPages && firstPage) {
        info(`This story has totally ${this.totalPages} Pages`);
        this.pages = new Array(this.totalPages);
      }

      if (this.classic) {
        this.processClassicStory(info, $, pageNum - 1);
      } else {
        this.processModernStory(info, $, pageNum - 1);
      }
    };

  processClassicStory = (info: Function = () => {}, $: ReturnType<typeof load>, ind: number) => {
    if (ind == 0) {
      // Get the metadata of the story from the loaded first page - this is for the classic view!
      this.title = this.title || $(".b-story-header h1").text().trim();
      this.author = this.author || $(".b-story-user-y").eq(0).children().eq(1).text().trim();
      this.authorURL = this.authorURL || $(".b-story-user-y").eq(0).children().eq(1).attr("href") || "";
    }

    this.pagesDone++;

    info(`Got page ${ind + 1}; Total pages done so far : ${this.pagesDone}`);

    this.pages[ind] = parse($(".b-story-body-x p").toString().trim());
  };

  processModernStory = (info: Function = () => {}, $: ReturnType<typeof load>, ind: number) => {
    if (ind == 0) {
      // Get the metadata of the story from the loaded first page - this is for the classic view!
      this.title = this.title || $(".panel.clearfix.j_bl.j_bv h1").text().trim();
      this.author = this.author || $(".clearfix.panel.y_eP.y_eQ").find(".y_eS>.y_eU").eq(0).text().trim();
      this.authorURL = this.authorURL || $(".clearfix.panel.y_eP.y_eQ").find(".y_eS>.y_eU").eq(0).attr("href") || "";
    }

    this.pagesDone++;

    info(`Got page ${ind + 1}; Total pages done so far : ${this.pagesDone}`);

    this.pages[ind] = parse($(".panel.article.aa_eQ").find(".aa_ht>div").toString().trim());
  };
}

export class Litero {
  private _story: Story;
  private _logger: Console;
  private _verbose: boolean;
  private _stream: boolean;
  private _format: string;
  private _template: string;
  private _templatePath: string;
  private _pageIndicator: boolean;
  private _userAgent: string = getRandomUserAgent();
  public get story(): Story {
    const { sep, posttitle, ...storyCopy } = this._story;
    return new Story(storyCopy);
  }

  constructor({ verbose, logger, stream, template, format, nopages }: GetStoryOptions = {}) {
    this._logger = logger ?? console;
    this._verbose = verbose ?? false;
    this._stream = stream ?? false;
    this._format = format ?? StoryFormat.HTML;
    this._template = "";
    if (template) {
      this._templatePath = fs.existsSync(path.join(process.cwd(), template)) ? path.join(process.cwd(), template) : "";
    } else {
    this._templatePath =
      fs.existsSync(path.join(templatesPath, `template.${this._format.toLocaleLowerCase()}`))
        ? path.join(templatesPath, `template.${this._format.toLocaleLowerCase()}`)
        : "";
    }
    this._pageIndicator = !nopages;
    this._story = new Story({});
  }

  public getStory = async (args: string | GetStoryOptions) => {
    const options = typeof args == "string" ? urlOptionToOptionObj(args) : args;
    options.classic = options.classic ?? false;
    options.format = options.format || StoryFormat.HTML;
    this._story = new Story({
      classic: options.classic,
      format: options.format as StoryFormat,
      filename: options.filename,
      url: options.url,
    });
    if (!this.validateOptions(options)) {
      return;
    }
    this.info(`Getting story from ${this.story.url}`);
    await this._story.requestPages(this.info);
    this.info(`Finished downloading all ${this._story.totalPages} pages.`);
    await this.output(options.format as StoryFormat, this._pageIndicator);
  };

  public validateOptions = (options: GetStoryOptions) => {
    if (!options.url) {
      return this.errorGettingStory("No URL Provided!");
    }

    this._story.url = options.url;

    const url =
      /^(?:https?\:\/\/)?(www\.|german\.|spanish\.|french\.|dutch\.|italian\.|romanian\.|portuguese\.|classic\.)?(?:i\.)?(literotica\.com)(\/s(?:tories)?\/(?:showstory\.php\?(?:url|id)=)?([a-z-0-9]+))$/.exec(
        this.story.url
      );

    if (!url) {
      return this.errorGettingStory("URL Provided was invalid.");
    }

    this._story.request = this._story.request || ({} as StoryRequest);
    this._story.request.path = url[3];
    this._story.request.host = `${url[1] || ""}${url[2]}`;

    if (options.classic || this._story.request.host.includes("classic")) {
      this._story.classic = true;
      this._story.request.host = this._story.request.host.replace(/^(www\.)?literotica\.com/gi, "classic.literotica.com");
      this._story.request.headers = {
        ...(this._story.request.headers || {}),
        Cookie: `enable_classic=1; ${this._story.request.headers?.Cookie || ""}`,
      };
    }

    this._story.request.headers = {
      ...(this._story.request.headers || {}),
      "User-Agent": this._userAgent,
    };

    this._story.filename = this._story.filename || url[4];

    if (
      !Object.hasOwnProperty(`output${this.story.format}`) &&
      !(Object.values(StoryFormat) as string[]).includes(options.format || "")
    ) {
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

    const content = this.story.buildContent(pageIndicator);

    this.info(WRITING_ATTEMPT_LOG_MESSAGE.replace("%s1", this.story.title).replace("%s2", this.story.filename));

    const replacementValues = {
      "%title%": this.story.title,
      "%posttitle%": requestedFormat == StoryFormat.HTML ? "" : this.story.posttitle,
      "%author%": this.story.author,
      "%authorurl%": this.story.authorURL,
      "%content%": content,
      "%postcontent%": requestedFormat == StoryFormat.HTML ? "" : this.story.posttitle,
      "%storyurl%": this.story.url,
    };

    const output = replaceAll(this._template, replacementValues);

    if (this._stream) {
      const force = true;
      this.info("The option stream was provided, streaming ~~~~~~~~~~~~");
      this.info(output, force);
      return;
    }

    // Replace the file suffix with the requested format.
    const filename = this.story.filename.replace(/(\.[a-z]+)?$/, `.${requestedFormat}`);
    await saveToFile(output, filename);
  };
}
