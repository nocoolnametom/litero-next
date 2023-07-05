/**
 * These are the options that are passed to Litero from the CLI.
 *
 * They are given to the {@link Litero} constructor as an object,
 * and are also given to the {@link Story} constructor as an object
 * when the Litero class is instantiated.
 */
export interface CLIOptions {
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
  series?: boolean;
}
