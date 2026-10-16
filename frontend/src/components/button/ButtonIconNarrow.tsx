import React, {type MouseEvent} from "react";
import {Button as PrimeButton, type ButtonProps} from "primereact/button";
import {Utils} from "../../utils/Utils";
import type {IconType} from "primereact/utils";

// button with an icon, narrowed to 1.5rem (21px), not narrowed on mobile, by default with margin "m-1" (0.25rem) (like XButton), the margin can be turned off (used for an editable table)
// the point of the narrow button is to save space
// button with icon (without label) - rename to ButtonNarrow?
export const ButtonIconNarrow = (props: {icon: IconType<ButtonProps>; onClick: ((event: MouseEvent<HTMLButtonElement>) => void); disabled?: boolean; tooltip?: any; addMargin?: boolean}) => {

    let className: string = '';
    if (!Utils.isMobile()) {
        className += 'x-button-icon-narrow';
    }
    if (props.addMargin === undefined || props.addMargin === true) {
        if (className !== '') {
            className += ' ';
        }
        className += 'm-1';
    }
    return (
        <PrimeButton icon={props.icon} onClick={props.onClick} disabled={props.disabled}
                className={className !== '' ? className : undefined} tooltip={props.tooltip}/>
    );
}
