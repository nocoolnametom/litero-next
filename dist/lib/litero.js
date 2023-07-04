"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Litero = exports.Story = void 0;
const fs_1 = __importDefault(require("fs"));
const cheerio_1 = require("cheerio");
const marked_1 = require("marked");
const helpers_1 = require("./helpers");
const path_1 = __importDefault(require("path"));
const useragents_json_1 = __importDefault(require("./useragents.json"));
const jsdom_1 = require("jsdom");
const dompurify_1 = __importDefault(require("dompurify"));
const node_europa_1 = __importDefault(require("node-europa"));
const getRandomUserAgent = (0, helpers_1.uniqueRandomArray)(useragents_json_1.default);
const sanitize = (0, dompurify_1.default)(new jsdom_1.JSDOM("").window).sanitize;
const parse = (html) => new node_europa_1.default().convert(sanitize(html).replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ""));
marked_1.marked.use({
    mangle: false,
    headerIds: false,
});
const WRITING_ATTEMPT_LOG_MESSAGE = 'Attempting to write to file: "%s1" as %s2';
const templatesPath = path_1.default.join(__dirname, "../../templates");
var StoryFormat;
(function (StoryFormat) {
    StoryFormat["HTML"] = "html";
    StoryFormat["TXT"] = "txt";
    StoryFormat["MD"] = "md";
})(StoryFormat || (StoryFormat = {}));
const urlOptionToOptionObj = (url) => {
    if (typeof url == "string") {
        return {
            url,
        };
    }
    return url;
};
class Story {
    constructor({ classic, title, url, author, authorURL, totalPages, pages, pagesDone, format, nobr, request, filename, }) {
        this.buildContent = (pageIndicator = true) => {
            const sep = this.format != StoryFormat.HTML ? "\n" : this.nobr ? "</p><p>" : "<br />";
            const joinedContent = this.pages
                .reduce((acc, page, i) => {
                const fullPage = this.format != StoryFormat.HTML ? page : marked_1.marked.parse(page);
                if (i == 0) {
                    return [fullPage];
                }
                if (pageIndicator) {
                    return acc.concat(["", `Page ${i + 1}:`, `${"-".repeat(10)}`, "", fullPage]);
                }
                return acc.concat(["", fullPage]);
            }, [])
                .join(sep);
            const content = this.format == StoryFormat.HTML ? joinedContent.replace(/(?:\r\b|\r|\n)/g, sep) : joinedContent;
            return content;
        };
        this.requestPages = async (info = () => { }) => {
            await this.requestFirstPage(info);
            await this.requestOtherPages(info);
        };
        this.requestFirstPage = async (info = () => { }) => {
            await this.requestPage(info)(1);
        };
        this.requestOtherPages = async (info = () => { }) => {
            if (this.totalPages <= 1) {
                return;
            }
            const pagesToGet = (0, helpers_1.arrayOfOtherPages)(this.totalPages);
            await Promise.all(pagesToGet.map(this.requestPage(info)));
        };
        this.getTotalPages = ($) => {
            var _a;
            if (this.totalPages) {
                return this.totalPages;
            }
            if (this.classic) {
                return $(".b-pager-pages select option").length;
            }
            return (_a = parseInt($(".l_bH a.l_bJ").last().text(), 10)) !== null && _a !== void 0 ? _a : 1;
        };
        this.requestPage = (info = () => { }) => async (pageNum = 1) => {
            // If the story has no known pages, then we're requesting the first page
            const firstPage = !this.totalPages;
            const { path, host, headers } = this.request || {};
            if (!path || !host) {
                console.error(`Looking up the story page ${pageNum} failed. Please try again later.`);
                return;
            }
            let html;
            try {
                const url = firstPage ? `https://${host}${path}` : `https://${host}${path}?page=${pageNum}`;
                info(`Requesting page - ${pageNum} - ${url}`);
                const page = await fetch(url, { headers });
                html = await page.text();
            }
            catch (err) {
                info("Error getting the story. Well, that sucks. Please try again later.");
                info(err);
                return;
            }
            const $ = (0, cheerio_1.load)(html);
            // Get the total pages from the classic page if we don't already know it
            this.totalPages = this.getTotalPages($);
            if (this.totalPages && firstPage) {
                info(`This story has totally ${this.totalPages} Pages`);
                this.pages = new Array(this.totalPages);
            }
            if (this.classic) {
                this.processClassicStory(info, $, pageNum - 1);
            }
            else {
                this.processModernStory(info, $, pageNum - 1);
            }
        };
        this.processClassicStory = (info = () => { }, $, ind) => {
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
        this.processModernStory = (info = () => { }, $, ind) => {
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
        this.classic = classic !== null && classic !== void 0 ? classic : false;
        this.author = author || "";
        this.authorURL = authorURL || "";
        this.filename = filename || "";
        this.format = format || StoryFormat.HTML;
        this.nobr = nobr !== null && nobr !== void 0 ? nobr : true;
        this.pages = pages || [];
        this.request = request;
        this.title = title || "";
        this.totalPages = totalPages || 0;
        this.pagesDone = pagesDone || 0;
        this.url = url || "";
    }
    get sep() {
        return this.format != StoryFormat.HTML ? "\n" : this.nobr ? "</p><p>" : "<br />";
    }
    // A row of dashes to separate the title from the content for non-html formats
    get posttitle() {
        return this.format == StoryFormat.HTML ? "" : "-".repeat(this.title.length);
    }
}
exports.Story = Story;
class Litero {
    get story() {
        const { sep, posttitle, ...storyCopy } = this._story;
        return new Story(storyCopy);
    }
    constructor({ verbose, logger, stream, template, format, nopages } = {}) {
        this._userAgent = getRandomUserAgent();
        this.getStory = async (args) => {
            var _a;
            const options = typeof args == "string" ? urlOptionToOptionObj(args) : args;
            options.classic = (_a = options.classic) !== null && _a !== void 0 ? _a : false;
            options.format = options.format || StoryFormat.HTML;
            this._story = new Story({
                classic: options.classic,
                format: options.format,
                filename: options.filename,
                url: options.url,
            });
            if (!this.validateOptions(options)) {
                return;
            }
            this.info(`Getting story from ${this.story.url}`);
            await this._story.requestPages(this.info);
            this.info(`Finished downloading all ${this._story.totalPages} pages.`);
            await this.output(options.format, this._pageIndicator);
        };
        this.validateOptions = (options) => {
            var _a;
            if (!options.url) {
                return this.errorGettingStory("No URL Provided!");
            }
            this._story.url = options.url;
            const url = /^(?:https?\:\/\/)?(www\.|german\.|spanish\.|french\.|dutch\.|italian\.|romanian\.|portuguese\.|classic\.)?(?:i\.)?(literotica\.com)(\/s(?:tories)?\/(?:showstory\.php\?(?:url|id)=)?([a-z-0-9]+))$/.exec(this.story.url);
            if (!url) {
                return this.errorGettingStory("URL Provided was invalid.");
            }
            this._story.request = this._story.request || {};
            this._story.request.path = url[3];
            this._story.request.host = `${url[1] || ""}${url[2]}`;
            if (options.classic || this._story.request.host.includes("classic")) {
                this._story.classic = true;
                this._story.request.host = this._story.request.host.replace(/^(www\.)?literotica\.com/gi, "classic.literotica.com");
                this._story.request.headers = {
                    ...(this._story.request.headers || {}),
                    Cookie: `enable_classic=1; ${((_a = this._story.request.headers) === null || _a === void 0 ? void 0 : _a.Cookie) || ""}`,
                };
            }
            this._story.request.headers = {
                ...(this._story.request.headers || {}),
                "User-Agent": this._userAgent,
            };
            this._story.filename = this._story.filename || url[4];
            if (!Object.hasOwnProperty(`output${this.story.format}`) &&
                !Object.values(StoryFormat).includes(options.format || "")) {
                this.errorGettingStory("Unknown Format provided in the arguments.");
                return false;
            }
            return true;
        };
        this.errorGettingStory = (err) => {
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
        this.info = (msg, force = false) => {
            if (this._verbose || force) {
                this._logger.log(`${(0, helpers_1.formatDateTime)()} - ${msg}`);
            }
        };
        this.loadTemplates = async () => {
            try {
                this._template = this._template || (await fs_1.default.promises.readFile(this._templatePath, "utf8"));
            }
            catch (err) {
                console.error("Error loading templates", err);
                console.info("Please make sure you have the templates folder set up correctly.");
            }
        };
        this.output = async (requestedFormat, pageIndicator = true) => {
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
            const output = (0, helpers_1.replaceAll)(this._template, replacementValues);
            if (this._stream) {
                const force = true;
                this.info("The option stream was provided, streaming ~~~~~~~~~~~~");
                this.info(output, force);
                return;
            }
            // Replace the file suffix with the requested format.
            const filename = this.story.filename.replace(/(\.[a-z]+)?$/, `.${requestedFormat}`);
            await (0, helpers_1.saveToFile)(output, filename);
        };
        this._logger = logger !== null && logger !== void 0 ? logger : console;
        this._verbose = verbose !== null && verbose !== void 0 ? verbose : false;
        this._stream = stream !== null && stream !== void 0 ? stream : false;
        this._format = format !== null && format !== void 0 ? format : StoryFormat.HTML;
        this._template = "";
        this._templatePath =
            (template !== null && template !== void 0 ? template : fs_1.default.existsSync(path_1.default.join(templatesPath, `template.${this._format.toLocaleLowerCase()}`)))
                ? path_1.default.join(templatesPath, `template.${this._format.toLocaleLowerCase()}`)
                : "";
        this._pageIndicator = !nopages;
        this._story = new Story({});
    }
}
exports.Litero = Litero;
