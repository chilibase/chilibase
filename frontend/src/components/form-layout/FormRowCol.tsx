import React, {type ReactNode, type CSSProperties, Children, isValidElement, cloneElement} from "react";
import {FormBase} from "../form";
import {Utils} from "../../utils/Utils";

// the purpose of FormRow/Col:
// 1a. if it is a "row", it lays elements next to each other into a row (uses flex and its default flex-direction: row)
// 1b. if it is a "col", it lays elements one under another into a column (default behavior of HTML elements)
// 2. it adds properties into its child elements (we don't have to write the property into all child elements)
// if a property is defined both on FormCol and on the child, the property on the child has higher priority
export interface FormRowColProps {
    className: "x-form-row" | "x-form-inline-row" | "x-form-col";
    form?: FormBase; // this cannot be used for now, because form is a required attribute on the components and is already used in the constructor, who knows if it would work at all
    width?: string | "full"; // sets css property {width: <props.width>} on the div (full sets 100%)
    labelStyle?: CSSProperties;
    style?: CSSProperties; // is transferred onto the div
    children: ReactNode;
}

export const FormRowCol = (props: FormRowColProps) => {

    let childElemList: ReactNode;
    if (props.form || props.labelStyle) {
        // if we want to change a child element, we need to either create a new one or clone it
        // an example is at https://soshace.com/building-react-components-using-children-props-and-context-api/
        childElemList = Children.map(props.children, child => {
            // text and other non-elements are rendered as they are
            if (!isValidElement<{form?: FormBase; labelStyle?: CSSProperties}>(child)) {
                return child;
            }
            // we would like to clone only our X* components (e.g. XInputText)
            // if we clone a foreign component (e.g. div), it works, but it adds into it the property labelstyle=[object Object]
            // child.type.name returns the component name (e.g. XInputText) but when an optimized build is created, it no longer works (there is e.g. "t" instead)
            // so for now we always clone
            return cloneElement(child, {form: child.props.form ?? props.form, labelStyle: child.props.labelStyle ?? props.labelStyle});
        });
    }
    else {
        childElemList = props.children; // no need to clone - more or less because of performance
    }

    let style: CSSProperties | undefined = props.style;
    if (props.width) {
        style = style ?? {};
        const width: string = (props.width === 'full' ? '100%' : props.width);
        Utils.addCssPropIfNotExists(style, {width: width}); // props.style has higher priority than props.width
    }

    return <div className={props.className} style={style}>{childElemList}</div>;
}

