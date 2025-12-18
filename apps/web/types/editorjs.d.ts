declare module "@editorjs/header" {
  import { BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";

  interface HeaderConfig {
    placeholder?: string;
    levels?: number[];
    defaultLevel?: number;
  }

  interface HeaderData {
    text: string;
    level: number;
  }

  export default class Header implements BlockTool {
    constructor(config: BlockToolConstructorOptions<HeaderData, HeaderConfig>);
    render(): HTMLElement;
    save(block: HTMLElement): HeaderData;
    static get toolbox(): { title: string; icon: string };
  }
}

declare module "@editorjs/list" {
  import { BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";

  interface ListConfig {
    defaultStyle?: "ordered" | "unordered";
  }

  interface ListData {
    style: "ordered" | "unordered";
    items: string[];
  }

  export default class List implements BlockTool {
    constructor(config: BlockToolConstructorOptions<ListData, ListConfig>);
    render(): HTMLElement;
    save(block: HTMLElement): ListData;
    static get toolbox(): { title: string; icon: string };
  }
}
