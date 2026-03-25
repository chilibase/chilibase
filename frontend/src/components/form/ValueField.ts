import React from "react";
import {FormField, FormFieldProps} from "./FormField";
import {Field} from "../../common/EntityMetadata";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";

export interface ValueFieldProps extends FormFieldProps {
    field: string;
    inputStyle?: React.CSSProperties;
    inputClassName?: string;
}

// common superclass for simple fields (not assoc fields)
export abstract class ValueField<P extends ValueFieldProps> extends FormField<P> {

    protected xField: Field;

    protected constructor(props: P) {
        super(props);

        this.xField = UtilsMetadataCommon.getFieldByPathStr(props.form.getEntity(), props.field);

        props.form.addField(props.field);
    }

    getField(): string {
        return this.props.field;
    }

    isNotNull(): boolean {
        return !this.xField.isNullable;
    }

    getTooltipsAndLabelElemId(
        field: string, label: string | undefined, value: string | null, labelTooltip: string | undefined, inputTooltip: string | undefined, desc: string | undefined
        ): {labelTooltip: string | undefined; labelElemId: string | undefined; inputTooltip: string | undefined} {

        if (value !== null) {
            // nevidno placeholder, skusime ho umiestnit do tooltip-u
            if (label !== undefined && labelTooltip === undefined) {
                labelTooltip = desc;
            }
            else {
                // nemame label alebo labelTooltip je obsadeny -> dame pripadny desc ako tooltip na input
                if (inputTooltip === undefined) {
                    inputTooltip = desc;
                }
            }
        }

        let labelElemId: string | undefined = undefined;
        if (labelTooltip) {
            labelElemId = `${field}_label_id`.replaceAll(".", "_"); // dots must be replaced, otherwise the selector does not work
        }
        return {labelTooltip, labelElemId, inputTooltip};
    }
}

