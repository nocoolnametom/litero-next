import { load } from "cheerio";
import { Story, StoryRequest } from "./story";
import { StoryFormat } from "./storyformats";
import { UrlRegex } from "./litero";

export class Series {
  private _initialStory: Story;
  private _format: `${StoryFormat}`;
  private _stories: Story[];
  private _request?: StoryRequest;
  public seriesUrl?: string;
  public title: string;
  public author: string;
  public authorUrl: string;

  constructor(story: Story, seriesUrl?: string) {
    story.setInSeries();
    this._initialStory = story;
    this._format = story.format || StoryFormat.HTML;
    this._stories = [] as Story[];
    this.seriesUrl = seriesUrl || this._initialStory.seriesUrl;
    this.title = "";
    this.author = "";
    this.authorUrl = "";
  }

  // A row of dashes to separate the title from the content for non-html formats
  public get posttitle(): string {
    return this._format == StoryFormat.HTML ? "" : "-".repeat(this.title.length ?? 5);
  }

  public get sep(): string {
    return this._format != StoryFormat.HTML ? "\n" : "<br />";
  }

  public get firstStoryUrlTitle(): string {
    const url = this._stories[0]?.url || "";
    if (!url) {
      return "";
    }
    const urlObj = UrlRegex.exec(url);
    if (!urlObj) {
      return "";
    }
    return urlObj[4] || "";
  }

  public requestSeries = async (info: Function = () => {}) => {
    if (!this.seriesUrl) {
      const force = true;
      info("No series URL provided", force);
      return;
    }
    const url = new URL(this.seriesUrl as string);
    // First we need to get the list of urls from the series page
    this._request = {
      path: url.pathname,
      host: url.host,
      headers: {
        ...(this._initialStory.request?.headers || {}),
      },
    } as StoryRequest;

    const { path, host, headers } = this._request || ({} as StoryRequest);
    if (!path || !host) {
      console.error(`Looking up the series page failed. Please try again later.`);
      return;
    }
    let html: string;
    try {
      const url = `https://${host}${path}`;
      info(`Requesting series page - ${url}`);
      const page = await fetch(url, { headers });
      html = await page.text();
    } catch (err) {
      info("Error getting the series. Well, that sucks. Please try again later.");
      info(err);
      return;
    }

    const $ = load(html);

    await this.processSeries(info, $);
  };

  processSeries = async (info: Function = () => {}, $: ReturnType<typeof load>) => {
    this.title = this.title || $(".panel.clearfix.j_bl.j_bv h1").text().trim();
    this.author = this.author || $(".clearfix.panel.y_eP.y_eQ").find(".y_eS>.y_eU").eq(0).text().trim();
    this.authorUrl = this.authorUrl || $(".clearfix.panel.y_eP.y_eQ").find(".y_eS>.y_eU").eq(0).attr("href") || "";

    const links = $(".page__main.page__main-wrapper.clearfix")
      .find(".panel.article.aa_eQ")
      .find("a.br_rj")
      .map((i, el) => {
        return $(el).attr("href")?.trim() || "";
      })
      .get();

    this._stories = links.map((link) => {
      const story = new Story({
        url: link,
        request: this._request,
        format: this._initialStory.format,
        classic: false,
        seriesUrl: this.seriesUrl,
        inSeries: true,
      });
      story.parseUrlToRequest(info);
      if (story.request?.path && this._initialStory.request?.path && story.request.path === this._initialStory.request.path) {
        return this._initialStory;
      }
      return story;
    });

    // Getting stories iteratively rather than all at once since there's some error with the current references that causes
    // each story to request the correct page number for subsequent pages BUT the initial URL is for the final chapter of the series!
    for (let i = 0; i < this._stories.length; i++) {
      const item = this._stories[i];
      await item.requestPages(info);
    }
  };

  buildContent(pageIndicator = true) {
    const inSeries = true;
    const content = this._stories.map((story) => story.buildContent(pageIndicator, inSeries)).join(`${this.sep + this.sep}`);
    return content;
  }
}
