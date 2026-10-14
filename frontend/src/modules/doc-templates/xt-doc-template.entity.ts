import type {XtDocTemplateFieldToJoin} from "./xt-doc-template-field-to-join.entity";
import type {User} from "../administration/user.entity";
import type {FileMeta} from "../administration/file-meta.entity";
import type {EnumValue} from "../administration/enum-value.entity";

export interface XtDocTemplate {
    id: number;
    label: string;
    comment: string | null;
    entity: string;
    xtDocTemplateFieldToJoinList: XtDocTemplateFieldToJoin[];
    templateId: string | null;
    templateType: EnumValue;
    templateXFile: FileMeta;
    fileNameTemplate: string | null;
    availableInForms: boolean;
    modifDate: Date | null;
    modifUser: User | null;
    version: number;
}
