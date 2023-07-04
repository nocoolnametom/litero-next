import { load } from "cheerio";
interface StoryRequest {
    path: string;
    host: string;
    page: number;
    headers: {
        [header: string]: string;
    };
}
declare enum StoryFormat {
    HTML = "html",
    TXT = "txt",
    MD = "md"
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
export declare class Story {
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
    constructor({ classic, title, url, author, authorURL, totalPages, pages, pagesDone, format, nobr, request, filename, }: {
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
    });
    get sep(): string;
    get posttitle(): string;
    buildContent: (pageIndicator?: boolean) => string;
    requestPages: (info?: Function) => Promise<void>;
    requestFirstPage: (info?: Function) => Promise<void>;
    requestOtherPages: (info?: Function) => Promise<void>;
    getTotalPages: ($: ReturnType<typeof load>) => number;
    requestPage: (info?: Function) => (pageNum?: number) => Promise<void>;
    processClassicStory: (info: Function | undefined, $: ReturnType<typeof load>, ind: number) => void;
    processModernStory: (info: Function | undefined, $: ReturnType<typeof load>, ind: number) => void;
}
export declare class Litero {
    private _story;
    private _logger;
    private _verbose;
    private _stream;
    private _format;
    private _template;
    private _templatePath;
    private _pageIndicator;
    private _userAgent;
    get story(): Story;
    constructor({ verbose, logger, stream, template, format, nopages }?: GetStoryOptions);
    getStory: (args: string | GetStoryOptions) => Promise<void>;
    validateOptions: (options: GetStoryOptions) => boolean | void;
    errorGettingStory: (err: string) => void;
    info: (msg: string, force?: boolean) => void;
    private loadTemplates;
    private output;
}
export {};
