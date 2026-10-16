import type {CSSProperties} from "react";
import {FormField, type FormFieldProps} from "./FormField";
import type {Field} from "../../common/EntityMetadata";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";

export interface ValueFieldProps extends FormFieldProps {
    field: string;
    inputStyle?: CSSProperties;
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
            // the placeholder is not visible, we try to place it into the tooltip
            if (label !== undefined && labelTooltip === undefined) {
                labelTooltip = desc;
            }
            else {
                // we don't have a label or labelTooltip is already used -> we put a possible desc as a tooltip on the input
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

