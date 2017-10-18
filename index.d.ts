export default logger;

declare namespace Choo {
  export interface LogOpts {
    colors?: object
  }
}

declare function logger(opts?: Choo.LogOpts): (state: any, emitter: any) => void;
