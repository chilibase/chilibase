import {Field} from "../../common/EntityMetadata";
// WARNING - if you use import from index.ts (not from file TableFormField), app gives error during start:
// Uncaught TypeError: Class extends value undefined is not a constructor or null
// (probably XInputDT cannot be instantiated)
import {TableFormField, TableFormFieldProps} from "./TableFormField";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import React from "react";

export interface TableValueFieldProps extends TableFormFieldProps {
    field: string;
    inputStyle?: React.CSSProperties; // pridane koli label/desc funkcionalite ale mozno sa zide aj pri DT sposobe (pouziva sa v subclasses, napr. TableMultilineTextField)
}

// common superclass for simple fields (not assoc fields)
export abstract class TableValueField<P extends TableValueFieldProps> extends TableFormField<P> {

    protected xField: Field;

    protected constructor(props: P) {
        super(props);

        this.xField = UtilsMetadataCommon.getFieldByPathStr(props.entity, props.field);
    }

    getField(): string {
        return this.props.field;
    }

    isNotNull(): boolean {
        return !this.xField.isNullable;
    }
}

