import {EnumType} from "./enum-type.entity";

export interface EnumValue {
    id: number;
    code: string;
    name: string;
    enabled: boolean;
    readOnly: boolean;
    enumOrder: number;
    enumType: EnumType;
}
