import {XField} from "../common/XEntityMetadata";
// WARNING - if you use import from index.ts (not from file FormComponentDT), app gives error during start:
// Uncaught TypeError: Class extends value undefined is not a constructor or null
// (probably XInputDT cannot be instantiated)
import {FormComponentDT, FormComponentDTProps} from "./form-data-table/FormComponentDT";
import {XUtilsMetadataCommon} from "../common/XUtilsMetadataCommon";
import React from "react";

export interface XInputDTProps extends FormComponentDTProps {
    field: string;
    inputStyle?: React.CSSProperties; // pridane koli label/desc funkcionalite ale mozno sa zide aj pri DT sposobe (pouziva sa v subclasses, napr. XInputTextareaRow)
}

// spolocna nadtrieda pre jednoduche inputy (nie asociacne)
export abstract class XInputDT<P extends XInputDTProps> extends FormComponentDT<P> {

    protected xField: XField;

    protected constructor(props: P) {
        super(props);

        this.xField = XUtilsMetadataCommon.getXFieldByPathStr(props.entity, props.field);
    }

    getField(): string {
        return this.props.field;
    }

    isNotNull(): boolean {
        return !this.xField.isNullable;
    }
}
