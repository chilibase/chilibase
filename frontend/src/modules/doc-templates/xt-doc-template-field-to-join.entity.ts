import {XtDocTemplate} from "./xt-doc-template.entity";

export interface XtDocTemplateFieldToJoin {
    id: number;
    xtDocTemplate: XtDocTemplate;
    field: string;
}
