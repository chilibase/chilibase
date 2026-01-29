import {User} from "./user.entity";
import {XEnum} from "./x-enum";

export interface XEnumEnum {
    id: number;
    code: string;
    name: string;
    readOnly: boolean;
    xEnumList: XEnum[];
    modifDate: Date;
    modifUser: User;
    version: number;
}