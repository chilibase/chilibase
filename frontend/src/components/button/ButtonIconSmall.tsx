import React, {type MouseEvent} from "react";
import {Button as PrimeButton, type ButtonProps} from "primereact/button";
import {Utils} from "../../utils/Utils";
import type {IconType} from "primereact/utils";

// button with icon (without label) - rename to ButtonSmall?
export const ButtonIconSmall = (props: {icon: IconType<ButtonProps>; onClick: ((event: MouseEvent<HTMLButtonElement>) => void); disabled?: boolean; tooltip?: any; tooltipShowDelay?: number;}) => {

    return (
        <PrimeButton icon={props.icon} onClick={props.onClick} disabled={props.disabled}
                className={Utils.isMobile() ? undefined : 'x-button-icon-small p-button-sm'} tooltip={props.tooltip} data-pr-showdelay={props.tooltipShowDelay}/>
    );
}
