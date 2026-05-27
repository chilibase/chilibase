// index file for reexport
// purpose is to have import:
// import {XMenubar, XMenuItem} from "@michalrakus/x-react-web-lib/menubar";
// instead of import:
// import {XMenuItem} from "@michalrakus/x-react-web-lib/XMenuItem";
// import {XMenubar} from "@michalrakus/x-react-web-lib/XMenubar";

export * from "./MenuBar";
export * from "./MenuItem";

/** @deprecated */
export {MenuBar as XMenubar} from "./MenuBar";
export {MenuItem as XMenuItem} from "./MenuItem";
