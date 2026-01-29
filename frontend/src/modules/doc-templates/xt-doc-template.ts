import {XtDocTemplateFieldToJoin} from "./xt-doc-template-field-to-join";
import {User} from "../../common/User";
import {XFile} from "../files/x-file";
import {XEnum} from "../../administration/x-enum";

export interface XtDocTemplate {
    id: number;
    label: string;
    comment: string | null;
    entity: string;
    xtDocTemplateFieldToJoinList: XtDocTemplateFieldToJoin[];
    templateId: string | null;
    templateType: XEnum;
    templateXFile: XFile;
    availableInForms: boolean;
    modifDate: Date | null;
    modifUser: User | null;
    version: number;
}
