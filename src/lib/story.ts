import { load } from "cheerio";
import { marked } from "marked";
import { arrayOfOtherPages } from "./helpers";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";
import Europa from "node-europa";
import { StoryFormat } from "./storyformats";
import { UrlRegex } from "./litero";

const sanitize = DOMPurify(new JSDOM("").window).sanitize;
const parse = (html: string) => new Europa().convert(sanitize(html).replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ""));
marked.use({
  mangle: false,
  headerIds: false,
});

export interface StoryRequest {
  path: string;
  host: string;
  headers: {
    [header: string]: string;
  };
}

export class Story {
  userAgent: string;
  classic: boolean;
  author: string;
  authorUrl: string;
  format: `${StoryFormat}`;
  pages: string[];
  request?: StoryRequest;
  title: string;
  totalPages: number;
  pagesDone: number;
  url: string;
  inSeries: boolean;
  seriesUrl: string;

  constructor({
    userAgent,
    inSeries,
    seriesUrl,
    classic,
    title,
    url,
    author,
    authorUrl,
    totalPages,
    pages,
    pagesDone,
    format,
    request,
  }: {
    userAgent?: string;
    inSeries?: boolean;
    seriesUrl?: string;
    classic?: boolean;
    author?: string;
    authorUrl?: string;
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
    this.userAgent = userAgent || "";
    this.inSeries = inSeries ?? false;
    this.seriesUrl = seriesUrl || "";
    this.classic = classic ?? false;
    this.author = author || "";
    this.authorUrl = authorUrl || "";
    this.format = format || StoryFormat.HTML;
    this.pages = pages || [];
    this.request = request;
    this.title = title || "";
    this.totalPages = totalPages || 0;
    this.pagesDone = pagesDone || 0;
    this.url = url || "";
  }

  public get sep(): string {
    return this.format != StoryFormat.HTML ? "\n" : "<br />";
  }

  // A row of dashes to separate the title from the content for non-html formats
  public get posttitle(): string {
    return this.format == StoryFormat.HTML ? "" : "-".repeat(this.title.length);
  }

  clone = (): Story => {
    return new Story({
      userAgent: this.userAgent,
      classic: this.classic,
      inSeries: this.inSeries,
      seriesUrl: this.seriesUrl,
      author: this.author,
      authorUrl: this.authorUrl,
      format: this.format,
      pages: [...this.pages],
      request: this.request ? {
        ...(this.request || {}),
        } : undefined,
      title: this.title,
      totalPages: this.totalPages,
      pagesDone: this.pagesDone,
      url: this.url,
    });
  };

  setInSeries = () => {
    this.inSeries = true;
  };

  buildContent = (pageIndicator = true, inSeries = false) => {
    const sep = this.sep;
    let header = "";
  
    if (inSeries) {
      switch (this.format) {
        case StoryFormat.HTML:
          header = `<h2>${this.title}</h2>`;
          break;
        case StoryFormat.MD:
          header = `## ${this.title}`;
          break;
        case StoryFormat.TXT:
        default:
          header = `${this.title}\n${this.posttitle}`;
          break;
      }
    }

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
    const output = [content];
    if (inSeries) {
      output.unshift(header);
    }
    return output.join(`${sep+sep}`);
  };

  parseUrlToRequest = (info: Function = () => { }) => {
    const url = UrlRegex.exec(this.url);
    if (!url) {
      const force = true;
      info(`The url ${this.url} is not valid.`, force);
      return;
    }

    this.request = this.request || ({} as StoryRequest);
    this.request.path = url[3];
    this.request.host = `${url[1] || ""}${url[2]}`;
    if (this.classic) {
      this.request.host = this.request.host.replace(/^(www\.)?literotica\.com/gi, "classic.literotica.com");
      this.request.headers = {
        ...(this.request.headers || {}),
        Cookie: `enable_classic=1; ${this.request.headers?.Cookie || ""}`,
      };
    }
    this.request.headers = {
      ...(this.request.headers || {}),
      "User-Agent": this.userAgent,
    };
  };

  requestPages = async (info: Function = () => { }) => {
    this.parseUrlToRequest(info);
    if (this.pages.length > 0) {
      // No need to look up a story a second time!
      return;
    }
    await this.requestFirstPage(info);
    await this.requestOtherPages(info);
    return this.seriesUrl || undefined;
  };

  requestFirstPage = async (info: Function = () => { }) => {
    await this.requestPage(info)(1);
  };

  requestOtherPages = async (info: Function = () => { }) => {
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

    return parseInt($(".l_bH a.l_bJ").last().text(), 10) || 1;
  };

  requestPage =
    (info: Function = () => { }) =>
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

  processClassicStory = (info: Function = () => { }, $: ReturnType<typeof load>, ind: number) => {
    if (ind == 0) {
      // Get the metadata of the story from the loaded first page - this is for the classic view!
      this.title = this.title || $(".b-story-header h1").text().trim();
      this.author = this.author || $(".b-story-user-y").eq(0).children().eq(1).text().trim();
      this.authorUrl = this.authorUrl || $(".b-story-user-y").eq(0).children().eq(1).attr("href") || "";
    }

    this.pagesDone++;

    info(`Got page ${ind + 1}; Total pages done so far : ${this.pagesDone}`);

    this.pages[ind] = parse($(".b-story-body-x p").toString().trim());
  };

  processModernStory = (info: Function = () => { }, $: ReturnType<typeof load>, ind: number) => {
    if (ind == 0) {
      // Get the metadata of the story from the loaded first page - this is for the classic view!
      this.title = this.title || $(".panel.clearfix.j_bl.j_bv h1").text().trim();
      this.author = this.author || $(".clearfix.panel.y_eP.y_eQ").find(".y_eS>.y_eU").eq(0).text().trim();
      this.authorUrl = this.authorUrl || $(".clearfix.panel.y_eP.y_eQ").find(".y_eS>.y_eU").eq(0).attr("href") || "";
    }

    this.pagesDone++;

    info(`Got page ${ind + 1}; Total pages done so far : ${this.pagesDone}`);

    this.pages[ind] = parse($(".panel.article.aa_eQ").find(".aa_ht>div").toString().trim());

    if (ind == this.totalPages - 1) {
      // Get the series URL from the last page of the story
      this.seriesUrl = this.seriesUrl || getSeriesUrl($);
    }
  };
}

export function getSeriesUrl($: ReturnType<typeof load>) {
  const sidePanel = $(".page__aside.page__aside--float");
  const readMoreSeriesPanel = sidePanel.find(".panel.z_r.z_R").first();
  const seriesLinkDiv = readMoreSeriesPanel.find(".z_S.z_fh").last();
  return seriesLinkDiv.find("a.z_t").attr("href") || "";
}