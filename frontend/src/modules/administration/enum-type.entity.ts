import {User} from "./user.entity";
import {EnumValue} from "./enum-value.entity";

export interface EnumType {
    id: number;
    code: string;
    name: string;
    readOnly: boolean;
    enumValueList: EnumValue[];
    modifDate: Date;
    modifUser: User;
    version: number;
}
